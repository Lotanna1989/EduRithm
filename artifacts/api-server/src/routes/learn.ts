import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { learnConceptsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/learn", async (req, res) => {
  try {
    const concepts = await db.select().from(learnConceptsTable);
    res.json(
      concepts.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        explanation: c.explanation,
        codeExample: c.codeExample,
        youtubeUrl: c.youtubeUrl,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to load learn concepts");
    res.status(500).json({ error: "Failed to load concepts" });
  }
});

export default router;
