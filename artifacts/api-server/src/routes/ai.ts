import { Router } from "express";
import { ideAssist, onboardStudent } from "../lib/gemini";

const router = Router();

// POST /ai/ide-assist
router.post("/ai/ide-assist", async (req, res) => {
  const { conceptTitle, conceptExplanation, currentCode, history, question } = req.body ?? {};
  if (!conceptTitle || !currentCode || !question) {
    res.status(400).json({ error: "conceptTitle, currentCode, and question are required" });
    return;
  }
  try {
    const { sessionGoal } = req.body ?? {};
    const reply = await ideAssist(
      String(conceptTitle),
      String(conceptExplanation ?? ""),
      String(currentCode),
      Array.isArray(history) ? history : [],
      String(question),
      sessionGoal ? String(sessionGoal) : undefined
    );
    res.json({ reply });
  } catch (err: any) {
    req.log.error({ err }, "ide-assist error");
    res.status(502).json({ error: err.message ?? "Gemini error" });
  }
});

// POST /ai/onboard
router.post("/ai/onboard", async (req, res) => {
  const { level, track } = req.body ?? {};
  if (!level || !track) {
    res.status(400).json({ error: "level and track are required" });
    return;
  }
  try {
    const result = await onboardStudent(String(level), String(track));
    res.json(result);
  } catch (err: any) {
    req.log.error({ err }, "onboard error");
    res.status(502).json({ error: err.message ?? "Gemini error" });
  }
});

export default router;
