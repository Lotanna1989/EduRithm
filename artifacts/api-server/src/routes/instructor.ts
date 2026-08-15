import { Router, type IRouter } from "express";
import { and, avg, count, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { assignmentsTable, submissionsTable } from "@workspace/db";
import {
  InstructorLoginBody,
  CreateBatchSubmissionsBody,
} from "@workspace/api-zod";
import { gradeHtml } from "../lib/gemini";
import { geminiCallsTable } from "@workspace/db";

const INSTRUCTOR_PASSWORD = process.env.INSTRUCTOR_PASSWORD ?? "edurithm2025";
const SESSION_KEY = "instructor_authenticated";

const router: IRouter = Router();

// Session helpers
function isAuthenticated(req: any): boolean {
  return req.session?.[SESSION_KEY] === true;
}

function requireAuth(req: any, res: any, next: any) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: "Instructor session required" });
    return;
  }
  next();
}

// POST /instructor/auth/login
router.post("/instructor/auth/login", (req, res) => {
  const parsed = InstructorLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Password required" });
    return;
  }
  if (parsed.data.password !== INSTRUCTOR_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  req.session[SESSION_KEY] = true;
  res.json({ authenticated: true });
});

// POST /instructor/auth/logout
router.post("/instructor/auth/logout", (req, res) => {
  req.session = null;
  res.status(204).end();
});

// GET /instructor/auth/session
router.get("/instructor/auth/session", (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

// GET /instructor/summary
router.get("/instructor/summary", requireAuth, async (req, res) => {
  try {
    const [totals] = await db
      .select({
        total: count(),
        flagged: count(
          eq(submissionsTable.flagged, true) ? submissionsTable.id : null
        ),
        avgScore: avg(submissionsTable.score),
      })
      .from(submissionsTable);

    const flaggedCount = await db
      .select({ count: count() })
      .from(submissionsTable)
      .where(eq(submissionsTable.flagged, true));

    const recent = await db
      .select()
      .from(submissionsTable)
      .orderBy(desc(submissionsTable.createdAt))
      .limit(5);

    res.json({
      totalSubmissions: Number(totals.total) || 0,
      flaggedSubmissions: Number(flaggedCount[0]?.count) || 0,
      averageScore: Math.round(Number(totals.avgScore) || 0),
      recentSubmissions: recent.map((row) => ({
        id: row.id,
        studentName: row.studentName,
        studentId: row.studentId,
        level: row.level,
        track: row.track,
        score: row.score,
        flagged: row.flagged,
        issuesFound: (row.issuesFound as string[]) ?? [],
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to load summary");
    res.status(500).json({ error: "Failed to load summary" });
  }
});

// GET /instructor/submissions
router.get("/instructor/submissions", requireAuth, async (req, res) => {
  try {
    const { flaggedOnly, level, track } = req.query;

    let query = db.select().from(submissionsTable).$dynamic();

    const conditions = [];
    if (flaggedOnly === "true") conditions.push(eq(submissionsTable.flagged, true));
    if (level && typeof level === "string") conditions.push(eq(submissionsTable.level, level));
    if (track && typeof track === "string") conditions.push(eq(submissionsTable.track, track));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query.orderBy(desc(submissionsTable.createdAt));

    res.json(
      rows.map((row) => ({
        id: row.id,
        studentName: row.studentName,
        studentId: row.studentId,
        level: row.level,
        track: row.track,
        score: row.score,
        flagged: row.flagged,
        issuesFound: (row.issuesFound as string[]) ?? [],
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list submissions");
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

// GET /instructor/submissions/:submissionId
router.get("/instructor/submissions/:submissionId", requireAuth, async (req, res) => {
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

  res.json({
    id: submission.id,
    studentName: submission.studentName,
    studentId: submission.studentId,
    level: submission.level,
    track: submission.track,
    assignment: assignments[0]
      ? { id: assignments[0].id, level: assignments[0].level, track: assignments[0].track, prompt: assignments[0].prompt }
      : { id: submission.assignmentId, level: "", track: "", prompt: "" },
    fileName: submission.fileName,
    codeContent: submission.codeContent,
    score: submission.score,
    meetsRequirements: submission.meetsRequirements,
    issuesFound: (submission.issuesFound as string[]) ?? [],
    explanation: submission.explanation,
    correctedSnippet: submission.correctedSnippet,
    flagged: submission.flagged,
    status: submission.status,
    createdAt: submission.createdAt.toISOString(),
    fixItUrl: `/fix/${submission.id}`,
  });
});

// POST /instructor/batch-submissions
router.post("/instructor/batch-submissions", requireAuth, async (req, res) => {
  const parsed = CreateBatchSubmissionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid batch submission data" });
    return;
  }

  const results = [];
  for (const sub of parsed.data.submissions) {
    // Resolve the assignment:
    // 1. If assignmentId is "auto" or blank, look up a real one by level+track.
    // 2. Otherwise try to find the specific ID.
    // 3. Fall back to a level+track lookup before creating a placeholder.
    let assignments: (typeof assignmentsTable.$inferSelect)[] = [];

    const isAuto = !sub.assignmentId || sub.assignmentId === "auto";
    if (!isAuto) {
      assignments = await db
        .select()
        .from(assignmentsTable)
        .where(eq(assignmentsTable.id, sub.assignmentId));
    }

    // If still not found, resolve by level+track
    if (assignments.length === 0) {
      assignments = await db
        .select()
        .from(assignmentsTable)
        .where(
          and(
            eq(assignmentsTable.level, sub.level),
            eq(assignmentsTable.track, sub.track)
          )
        )
        .limit(1);
    }

    // Last resort: create a generic placeholder
    if (assignments.length === 0) {
      const [newAssignment] = await db
        .insert(assignmentsTable)
        .values({ level: sub.level, track: sub.track, prompt: "Classroom assignment" })
        .returning();
      assignments.push(newAssignment);
    }

    const assignment = assignments[0];

    const [submission] = await db
      .insert(submissionsTable)
      .values({
        studentName: sub.studentName,
        studentId: sub.studentId,
        level: sub.level,
        track: sub.track,
        assignmentId: assignment.id,
        fileName: sub.fileName,
        codeContent: sub.codeContent,
        status: "queued",
        flagged: true,
        issuesFound: [],
      })
      .returning();

    try {
      const result = await gradeHtml(assignment.prompt, sub.fileName, sub.codeContent);
      const flagged = result.score < 60 || !result.meets_requirements;

      await db.insert(geminiCallsTable).values({
        submissionId: submission.id,
        kind: "grading",
        request: `${assignment.prompt}\n---\n${sub.codeContent.slice(0, 500)}`,
        response: JSON.stringify(result),
      });

      const [graded] = await db
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

      results.push({
        id: graded.id,
        studentName: graded.studentName,
        studentId: graded.studentId,
        level: graded.level,
        track: graded.track,
        assignment: { id: assignment.id, level: assignment.level, track: assignment.track, prompt: assignment.prompt },
        fileName: graded.fileName,
        codeContent: graded.codeContent,
        score: graded.score,
        meetsRequirements: graded.meetsRequirements,
        issuesFound: (graded.issuesFound as string[]) ?? [],
        explanation: graded.explanation,
        correctedSnippet: graded.correctedSnippet,
        flagged: graded.flagged,
        status: graded.status,
        createdAt: graded.createdAt.toISOString(),
        fixItUrl: `/fix/${graded.id}`,
      });
    } catch (err) {
      req.log.error({ err, submissionId: submission.id }, "Batch grading error");
      await db
        .update(submissionsTable)
        .set({ status: "failed" })
        .where(eq(submissionsTable.id, submission.id));
    }
  }

  res.status(201).json(results);
});

export default router;
