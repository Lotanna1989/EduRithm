import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  assignmentsTable,
  submissionsTable,
  chatMessagesTable,
  geminiCallsTable,
} from "@workspace/db";
import {
  CreateSubmissionBody,
  SendSubmissionChatBody,
} from "@workspace/api-zod";
import { gradeHtml, chatAboutCode } from "../lib/gemini";

const CHAT_LIMIT = 5;
const router: IRouter = Router();

function buildFixItUrl(submissionId: string): string {
  return `/fix/${submissionId}`;
}

function formatSubmission(
  row: typeof submissionsTable.$inferSelect,
  assignment: typeof assignmentsTable.$inferSelect
) {
  return {
    id: row.id,
    studentName: row.studentName,
    studentId: row.studentId,
    level: row.level,
    track: row.track,
    assignment: {
      id: assignment.id,
      level: assignment.level,
      track: assignment.track,
      prompt: assignment.prompt,
    },
    fileName: row.fileName,
    codeContent: row.codeContent,
    score: row.score,
    meetsRequirements: row.meetsRequirements,
    issuesFound: (row.issuesFound as string[]) ?? [],
    explanation: row.explanation,
    correctedSnippet: row.correctedSnippet,
    flagged: row.flagged,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    fixItUrl: buildFixItUrl(row.id),
  };
}

// POST /submissions
router.post("/submissions", async (req, res) => {
  const parsed = CreateSubmissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid submission data" });
    return;
  }

  const { studentName, studentId, level, track, assignmentId, fileName, codeContent } =
    parsed.data;

  // Validate assignment exists
  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, assignmentId));

  if (assignments.length === 0) {
    res.status(400).json({ error: "Assignment not found" });
    return;
  }
  const assignment = assignments[0];

  // Insert submission record first
  const [submission] = await db
    .insert(submissionsTable)
    .values({
      studentName,
      studentId,
      level,
      track,
      assignmentId,
      fileName,
      codeContent,
      status: "queued",
      flagged: true,
      issuesFound: [],
    })
    .returning();

  // Grade with Gemini
  let graded: typeof submission;
  try {
    const result = await gradeHtml(assignment.prompt, fileName, codeContent);
    const flagged = result.score < 60 || !result.meets_requirements;

    // Log the Gemini call
    await db.insert(geminiCallsTable).values({
      submissionId: submission.id,
      kind: "grading",
      request: `${assignment.prompt}\n---\n${codeContent.slice(0, 500)}`,
      response: JSON.stringify(result),
    });

    [graded] = await db
      .update(submissionsTable)
      .set({
        score: result.score,
        meetsRequirements: result.meets_requirements,
        issuesFound: result.issues_found,
        explanation: result.explanation,
        correctedSnippet: result.corrected_snippet,
        flagged,
        status: "graded",
      })
      .where(eq(submissionsTable.id, submission.id))
      .returning();
  } catch (err) {
    req.log.error({ err }, "Gemini grading failed");
    [graded] = await db
      .update(submissionsTable)
      .set({ status: "failed" })
      .where(eq(submissionsTable.id, submission.id))
      .returning();
    res.status(503).json({ error: "Grading service unavailable. Please try again." });
    return;
  }

  res.status(201).json(formatSubmission(graded, assignment));
});

// GET /submissions/:submissionId
router.get("/submissions/:submissionId", async (req, res) => {
  const { submissionId } = req.params;

  const rows = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, submissionId));

  if (rows.length === 0) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  const submission = rows[0];

  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, submission.assignmentId));

  res.json(formatSubmission(submission, assignments[0]));
});

// GET /submissions/:submissionId/chat
router.get("/submissions/:submissionId/chat", async (req, res) => {
  const { submissionId } = req.params;

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.submissionId, submissionId));

  res.json(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

// POST /submissions/:submissionId/chat
router.post("/submissions/:submissionId/chat", async (req, res) => {
  const { submissionId } = req.params;
  const parsed = SendSubmissionChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Message content is required" });
    return;
  }
  const { content } = parsed.data;

  // Load submission
  const submissions = await db
    .select()
    .from(submissionsTable)
    .where(eq(submissionsTable.id, submissionId));
  if (submissions.length === 0) {
    res.status(404).json({ error: "Submission not found" });
    return;
  }
  const submission = submissions[0];

  // Load assignment
  const assignments = await db
    .select()
    .from(assignmentsTable)
    .where(eq(assignmentsTable.id, submission.assignmentId));

  // Load existing messages
  const existing = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.submissionId, submissionId));

  const studentMessages = existing.filter((m) => m.role === "student");
  if (studentMessages.length >= CHAT_LIMIT) {
    res.status(429).json({ error: "Chat limit reached. Ask your instructor for more help." });
    return;
  }

  // Save user message
  const [userMsg] = await db
    .insert(chatMessagesTable)
    .values({ submissionId, role: "student", content })
    .returning();

  // Call Gemini
  let assistantContent: string;
  try {
    const history = existing.map((m) => ({
      role: m.role as "student" | "assistant",
      content: m.content,
    }));
    assistantContent = await chatAboutCode(
      assignments[0]?.prompt ?? "",
      submission.codeContent,
      submission.explanation ?? "",
      history,
      content
    );

    // Log
    await db.insert(geminiCallsTable).values({
      submissionId,
      kind: "chat",
      request: content,
      response: assistantContent,
    });
  } catch (err) {
    req.log.error({ err }, "Gemini chat failed");
    // Remove the user message we just saved
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, userMsg.id));
    res.status(503).json({ error: "Chat service unavailable. Please try again." });
    return;
  }

  const [assistantMsg] = await db
    .insert(chatMessagesTable)
    .values({ submissionId, role: "assistant", content: assistantContent })
    .returning();

  const allStudentMsgs = await db
    .select()
    .from(chatMessagesTable)
    .where(
      and(
        eq(chatMessagesTable.submissionId, submissionId),
        eq(chatMessagesTable.role, "student")
      )
    );

  res.status(201).json({
    userMessage: { id: userMsg.id, role: "student", content: userMsg.content, createdAt: userMsg.createdAt.toISOString() },
    assistantMessage: { id: assistantMsg.id, role: "assistant", content: assistantMsg.content, createdAt: assistantMsg.createdAt.toISOString() },
    messagesRemaining: Math.max(0, CHAT_LIMIT - allStudentMsgs.length),
  });
});

export default router;
