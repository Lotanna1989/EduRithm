import { Router, type IRouter } from "express";
import { ReviewHtmlBody } from "@workspace/api-zod";
import { reviewHtmlOpen } from "../lib/gemini";

const router: IRouter = Router();

// POST /review — open-ended HTML review, no assignment required
router.post("/review", async (req, res) => {
  const parsed = ReviewHtmlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "fileName and codeContent are required" });
    return;
  }

  const { fileName, codeContent } = parsed.data;

  try {
    const result = await reviewHtmlOpen(fileName, codeContent);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Open review failed");
    res.status(503).json({ error: "Review service unavailable. Please try again." });
  }
});

export default router;
