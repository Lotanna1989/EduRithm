import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { oppUsersTable, oppCacheTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { generateOpportunities, type OpportunitiesFeed } from "../lib/opportunities";

const router: IRouter = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function getOppUserId(req: any): string | undefined {
  return req.session?.oppUserId as string | undefined;
}

async function getUserById(id: string) {
  const [user] = await db
    .select()
    .from(oppUsersTable)
    .where(eq(oppUsersTable.id, id))
    .limit(1);
  return user ?? null;
}

async function getCachedFeed(userId: string) {
  const [row] = await db
    .select()
    .from(oppCacheTable)
    .where(
      and(
        eq(oppCacheTable.userId, userId),
        gt(oppCacheTable.expiresAt, new Date())
      )
    )
    .orderBy(oppCacheTable.createdAt)
    .limit(1);
  return row ?? null;
}

async function saveFeed(userId: string, feed: OpportunitiesFeed) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h
  const [row] = await db
    .insert(oppCacheTable)
    .values({ userId, results: feed as any, expiresAt })
    .returning();
  return row;
}

// ── POST /opportunities/session — login / register ────────────────────────────
router.post("/opportunities/session", async (req, res) => {
  const { name, email, state, region } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !state?.trim() || !region?.trim()) {
    res.status(400).json({ error: "name, email, state and region are required." });
    return;
  }

  try {
    // Upsert by email
    const existing = await db
      .select()
      .from(oppUsersTable)
      .where(eq(oppUsersTable.email, email.trim().toLowerCase()))
      .limit(1);

    let user = existing[0];
    if (!user) {
      const [created] = await db
        .insert(oppUsersTable)
        .values({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          state: state.trim(),
          region: region.trim(),
        })
        .returning();
      user = created;
    }

    (req as any).session.oppUserId = user.id;

    res.json({ id: user.id, name: user.name, email: user.email, state: user.state, region: user.region });
  } catch (err: any) {
    req.log.error({ err }, "Opportunities login failed");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ── GET /opportunities/session — current user ────────────────────────────────
router.get("/opportunities/session", async (req, res) => {
  const userId = getOppUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in." }); return; }

  const user = await getUserById(userId);
  if (!user) { res.status(401).json({ error: "Session expired. Please log in again." }); return; }

  res.json({ id: user.id, name: user.name, email: user.email, state: user.state, region: user.region });
});

// ── DELETE /opportunities/session — logout ───────────────────────────────────
router.delete("/opportunities/session", (req, res) => {
  (req as any).session.oppUserId = undefined;
  res.json({ ok: true });
});

// ── GET /opportunities/feed — cached or fresh ────────────────────────────────
router.get("/opportunities/feed", async (req, res) => {
  const userId = getOppUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in." }); return; }

  const user = await getUserById(userId);
  if (!user) { res.status(401).json({ error: "Session expired." }); return; }

  try {
    const cached = await getCachedFeed(userId);
    if (cached) {
      const ageMs = Date.now() - new Date(cached.createdAt).getTime();
      res.json({ ...(cached.results as OpportunitiesFeed), cached: true, cacheAge: Math.floor(ageMs / 60000) });
      return;
    }

    // No cache — call Gemini
    const feed = await generateOpportunities(user.name, user.state, user.region);
    await saveFeed(userId, feed);
    res.json({ ...feed, cached: false, cacheAge: 0 });
  } catch (err: any) {
    req.log.error({ err }, "Opportunities feed failed");
    res.status(500).json({ error: "Could not load opportunities. Please try again shortly." });
  }
});

// ── POST /opportunities/refresh — force regenerate ───────────────────────────
router.post("/opportunities/refresh", async (req, res) => {
  const userId = getOppUserId(req);
  if (!userId) { res.status(401).json({ error: "Not logged in." }); return; }

  const user = await getUserById(userId);
  if (!user) { res.status(401).json({ error: "Session expired." }); return; }

  try {
    const feed = await generateOpportunities(user.name, user.state, user.region);
    await saveFeed(userId, feed);
    res.json({ ...feed, cached: false, cacheAge: 0 });
  } catch (err: any) {
    req.log.error({ err }, "Opportunities refresh failed");
    res.status(500).json({ error: "Could not refresh opportunities. Please try again." });
  }
});

export default router;
