import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { waitlistTable } from "@workspace/db";
import { JoinWaitlistBody } from "@workspace/api-zod";

const router: IRouter = Router();

// POST /waitlist — public, no auth
router.post("/waitlist", async (req, res) => {
  const parsed = JoinWaitlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Name, email, and at least one area of interest are required." });
    return;
  }

  const { name, email, interests } = parsed.data;

  if (interests.length === 0) {
    res.status(400).json({ error: "Please select at least one area of interest." });
    return;
  }

  try {
    const [entry] = await db
      .insert(waitlistTable)
      .values({ name: name.trim(), email: email.trim().toLowerCase(), interests })
      .returning();

    res.status(201).json({
      id: entry.id,
      message: `You're on the list, ${name.split(" ")[0]}! We'll reach out at ${email} when your area of interest launches.`,
    });
  } catch (err: any) {
    // Postgres unique violation on email would be code 23505, but we allow
    // duplicate emails for now — just store every signup
    req.log.error({ err }, "Waitlist insert failed");
    res.status(500).json({ error: "Could not save your signup. Please try again." });
  }
});

export default router;
