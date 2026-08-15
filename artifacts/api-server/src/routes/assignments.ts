import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { assignmentsTable } from "@workspace/db";
import { GetRandomAssignmentQueryParams } from "@workspace/api-zod";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/assignments/random", async (req, res) => {
  const parsed = GetRandomAssignmentQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid level or track parameter" });
    return;
  }
  const { level, track } = parsed.data;

  try {
    const rows = await db
      .select()
      .from(assignmentsTable)
      .where(
        sql`${assignmentsTable.level} = ${level} AND ${assignmentsTable.track} = ${track}`
      );

    if (rows.length === 0) {
      res.status(400).json({ error: "No assignment found for this level and track" });
      return;
    }

    const assignment = rows[Math.floor(Math.random() * rows.length)];
    res.json({
      id: assignment.id,
      level: assignment.level,
      track: assignment.track,
      prompt: assignment.prompt,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get random assignment");
    res.status(500).json({ error: "Failed to load assignment" });
  }
});

export default router;
