import { Router, type IRouter } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { assignmentsTable, submissionsTable, geminiCallsTable } from "@workspace/db";
import { ImportClassroomSubmissionsBody } from "@workspace/api-zod";
import { gradeHtml } from "../lib/gemini";

const router: IRouter = Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// Derived from the stable dev domain so it always matches what's registered in GCP.
const REDIRECT_URI = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/callback`;

const SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.student-submissions.students.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  // classroom.grades is a RESTRICTED scope — requires Google security assessment
  // before it can be requested in production or testing. Kept here as a comment
  // until the app completes Google's OAuth verification process.
  // "https://www.googleapis.com/auth/classroom.grades",
].join(" ");

// ─── Session helpers ────────────────────────────────────────────────────────

type GoogleTokens = { accessToken: string; email: string };

function googleTokens(req: any): GoogleTokens | undefined {
  return req.session?.googleTokens as GoogleTokens | undefined;
}

// ─── Classroom API helper ────────────────────────────────────────────────────

async function gFetch(path: string, accessToken: string): Promise<unknown> {
  const res = await fetch(`https://classroom.googleapis.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Classroom API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

async function gPatch(path: string, body: unknown, accessToken: string): Promise<unknown> {
  const res = await fetch(`https://classroom.googleapis.com${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Classroom PATCH ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ── Drive file download helper ─────────────────────────────────────────────
// Handles both regular uploaded files (alt=media) and Google Workspace files
// (Docs → export as HTML, Sheets/Slides → unsupported).
const GOOGLE_WORKSPACE_TYPES: Record<string, string> = {
  "application/vnd.google-apps.document": "text/html",
  "application/vnd.google-apps.presentation": "text/plain",
};
const UNSUPPORTED_WORKSPACE = new Set([
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.form",
  "application/vnd.google-apps.drawing",
]);

async function downloadDriveFile(
  fileId: string,
  mimeType: string | undefined,
  accessToken: string
): Promise<{ content: string; skipped: false } | { skipped: true; reason: string }> {
  // Unsupported Google Workspace type
  if (mimeType && UNSUPPORTED_WORKSPACE.has(mimeType)) {
    return { skipped: true, reason: `File type "${mimeType}" cannot be graded as code` };
  }

  // Google Docs / Presentations → export endpoint
  const exportMime = mimeType ? GOOGLE_WORKSPACE_TYPES[mimeType] : undefined;
  const url = exportMime
    ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`
    : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const body = await res.text();
    return { skipped: true, reason: `Drive download failed (${res.status}): ${body.slice(0, 200)}` };
  }
  const content = await res.text();
  if (!content.trim()) {
    return { skipped: true, reason: "File is empty" };
  }
  return { skipped: false, content };
}

// ── Pick the best attachment from a submission's attachment list ────────────
// Priority: .html > Google Doc > any other driveFile > link
function pickAttachment(attachments: any[]): {
  driveFile?: { id: string; title: string; mimeType?: string };
  link?: { url: string; title?: string };
} | null {
  const driveFiles: any[] = attachments.filter((a: any) => a.driveFile);
  if (driveFiles.length === 0) {
    const link = attachments.find((a: any) => a.link);
    return link ? { link: link.link } : null;
  }
  // Prefer html, then google-doc, then anything else
  const html = driveFiles.find((a: any) =>
    a.driveFile.title?.toLowerCase().endsWith(".html")
  );
  if (html) return { driveFile: html.driveFile };
  const doc = driveFiles.find((a: any) =>
    a.driveFile.mimeType === "application/vnd.google-apps.document"
  );
  if (doc) return { driveFile: doc.driveFile };
  // Fall back to any driveFile that looks like code or text
  const text = driveFiles.find((a: any) => {
    const t = a.driveFile.title?.toLowerCase() ?? "";
    return (
      t.endsWith(".txt") || t.endsWith(".js") || t.endsWith(".css") ||
      t.endsWith(".py") || t.endsWith(".ts") || t.endsWith(".jsx") ||
      t.endsWith(".tsx") || t.endsWith(".json")
    );
  });
  return text ? { driveFile: text.driveFile } : { driveFile: driveFiles[0].driveFile };
}

async function gPost(path: string, body: unknown, accessToken: string): Promise<unknown> {
  const res = await fetch(`https://classroom.googleapis.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Classroom POST ${res.status}: ${text.slice(0, 300)}`);
  }
  // :return endpoints respond 200 with empty body
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

// ─── OAuth ──────────────────────────────────────────────────────────────────

// GET /auth/google  →  redirect to Google consent screen (browser navigation, not XHR)
router.get("/auth/google", (_req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /auth/callback  →  exchange code, store tokens, redirect back to instructor dashboard
router.get("/auth/callback", async (req, res) => {
  const { code, error } = req.query as Record<string, string | undefined>;
  if (error || !code) {
    res.redirect("/instructor?classroom=error");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokens.access_token) {
      req.log.error({ tokens }, "Token exchange returned no access_token");
      res.redirect("/instructor?classroom=error");
      return;
    }

    // Fetch the authenticated teacher's email for display
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info = (await infoRes.json()) as { email?: string };

    req.session!.googleTokens = {
      accessToken: tokens.access_token,
      email: info.email ?? "",
    };

    res.redirect("/instructor?classroom=connected");
  } catch (err) {
    req.log.error({ err }, "OAuth callback error");
    res.redirect("/instructor?classroom=error");
  }
});

// GET /auth/status
router.get("/auth/status", (req, res) => {
  const tok = googleTokens(req);
  res.json({ connected: !!tok?.accessToken, email: tok?.email ?? null });
});

// POST /auth/disconnect
router.post("/auth/disconnect", (req, res) => {
  if (req.session) req.session.googleTokens = undefined;
  res.status(204).end();
});

// ─── Classroom data endpoints ────────────────────────────────────────────────

// GET /classroom/courses
router.get("/classroom/courses", async (req, res) => {
  const tok = googleTokens(req);
  if (!tok) { res.status(401).json({ error: "Not connected to Google Classroom" }); return; }

  try {
    const data = (await gFetch("/v1/courses?teacherId=me&courseStates=ACTIVE", tok.accessToken)) as {
      courses?: Array<{ id: string; name: string; section?: string; enrollmentCode?: string }>;
    };
    res.json(
      (data.courses ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section ?? null,
        enrollmentCode: c.enrollmentCode ?? null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "listCourses failed");
    res.status(502).json({ error: "Could not fetch courses from Google Classroom" });
  }
});

// GET /classroom/courses/:courseId/coursework
router.get("/classroom/courses/:courseId/coursework", async (req, res) => {
  const tok = googleTokens(req);
  if (!tok) { res.status(401).json({ error: "Not connected to Google Classroom" }); return; }

  try {
    const data = (await gFetch(
      `/v1/courses/${req.params.courseId}/courseWork`,
      tok.accessToken
    )) as {
      courseWork?: Array<{ id: string; title: string; description?: string; state?: string }>;
    };
    res.json(
      (data.courseWork ?? []).map((cw) => ({
        id: cw.id,
        title: cw.title,
        description: cw.description ?? null,
        state: cw.state ?? "UNKNOWN",
      }))
    );
  } catch (err) {
    req.log.error({ err }, "listCoursework failed");
    res.status(502).json({ error: "Could not fetch coursework" });
  }
});

// GET /classroom/courses/:courseId/coursework/:courseworkId/submissions
router.get(
  "/classroom/courses/:courseId/coursework/:courseworkId/submissions",
  async (req, res) => {
    const tok = googleTokens(req);
    if (!tok) { res.status(401).json({ error: "Not connected to Google Classroom" }); return; }

    const { courseId, courseworkId } = req.params;

    try {
      const [subData, rosterData] = await Promise.all([
        gFetch(
          `/v1/courses/${courseId}/courseWork/${courseworkId}/studentSubmissions`,
          tok.accessToken
        ),
        gFetch(`/v1/courses/${courseId}/students`, tok.accessToken),
      ]) as [
        { studentSubmissions?: any[] },
        { students?: Array<{ userId: string; profile?: { name?: { fullName?: string } } }> }
      ];

      const nameMap: Record<string, string> = {};
      for (const s of rosterData.students ?? []) {
        nameMap[s.userId] = s.profile?.name?.fullName ?? s.userId;
      }

      res.json(
        (subData.studentSubmissions ?? []).map((sub: any) => {
          const attachments: any[] = sub.assignmentSubmission?.attachments ?? [];
          const picked = pickAttachment(attachments);
          return {
            id: sub.id,
            userId: sub.userId,
            studentName: nameMap[sub.userId] ?? sub.userId,
            state: sub.state ?? "UNKNOWN",
            hasHtmlAttachment: !!(picked?.driveFile),
            attachmentFileId: picked?.driveFile?.id ?? null,
            attachmentFileName: picked?.driveFile?.title ?? picked?.link?.title ?? null,
            attachmentMimeType: picked?.driveFile?.mimeType ?? null,
          };
        })
      );
    } catch (err) {
      req.log.error({ err }, "listSubmissions failed");
      res.status(502).json({ error: "Could not fetch student submissions" });
    }
  }
);

// POST /classroom/import
router.post("/classroom/import", async (req, res) => {
  const tok = googleTokens(req);
  if (!tok) { res.status(401).json({ error: "Not connected to Google Classroom" }); return; }

  const parsed = ImportClassroomSubmissionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid import payload" });
    return;
  }

  const { courseId, courseworkId, courseworkTitle, submissionIds } = parsed.data;

  // Pull submissions and roster from Classroom
  const [subData, rosterData] = await Promise.all([
    gFetch(
      `/v1/courses/${courseId}/courseWork/${courseworkId}/studentSubmissions`,
      tok.accessToken
    ),
    gFetch(`/v1/courses/${courseId}/students`, tok.accessToken),
  ]) as [{ studentSubmissions?: any[] }, { students?: any[] }];

  const nameMap: Record<string, string> = {};
  for (const s of (rosterData.students ?? [])) {
    nameMap[s.userId] = s.profile?.name?.fullName ?? s.userId;
  }

  const toImport = (subData.studentSubmissions ?? []).filter((s: any) =>
    submissionIds.includes(s.id)
  );

  // Resolve or create a placeholder assignment
  let [assignment] = await db
    .select()
    .from(assignmentsTable)
    .where(
      and(
        eq(assignmentsTable.level, "300L"),
        eq(assignmentsTable.track, "Web and Software Engineering")
      )
    )
    .limit(1);

  if (!assignment) {
    [assignment] = await db
      .insert(assignmentsTable)
      .values({ level: "300L", track: "Web and Software Engineering", prompt: courseworkTitle })
      .returning();
  }

  const results: unknown[] = [];

  for (const sub of toImport) {
    const studentName = nameMap[sub.userId] ?? sub.userId;
    const attachments: any[] = sub.assignmentSubmission?.attachments ?? [];
    const picked = pickAttachment(attachments);

    if (!picked?.driveFile) {
      const reason = attachments.length === 0
        ? "Student has not attached any file"
        : "No supported file attachment found (link-only submissions cannot be graded)";
      req.log.warn({ submissionId: sub.id }, reason);
      results.push({ skipped: true, studentName, reason });
      continue;
    }

    // Download from Drive (handles Google Docs export automatically)
    let codeContent: string;
    try {
      const dl = await downloadDriveFile(
        picked.driveFile.id,
        picked.driveFile.mimeType,
        tok.accessToken
      );
      if (dl.skipped) {
        req.log.warn({ submissionId: sub.id, reason: dl.reason }, "Drive download skipped");
        results.push({ skipped: true, studentName, reason: dl.reason });
        continue;
      }
      codeContent = dl.content;
    } catch (err) {
      req.log.error({ err }, "Drive fetch error");
      results.push({ skipped: true, studentName, reason: "Drive fetch threw an unexpected error" });
      continue;
    }

    const fileName = picked.driveFile.title as string;

    // Insert submission record, grade it, update
    const [submission] = await db
      .insert(submissionsTable)
      .values({
        studentName,
        studentId: sub.userId,
        level: "300L",
        track: "Web and Software Engineering",
        assignmentId: assignment.id,
        fileName,
        codeContent,
        status: "queued",
        flagged: true,
        issuesFound: [],
        // Store Classroom back-reference so we can post grades later
        classroomSubmissionId: sub.id,
        classroomCourseId: courseId,
        classroomCourseWorkId: courseworkId,
      })
      .returning();

    try {
      const graded = await gradeHtml(courseworkTitle, fileName, codeContent);
      const flagged = graded.score < 60 || !graded.meets_requirements;

      await db.insert(geminiCallsTable).values({
        submissionId: submission.id,
        kind: "grading",
        request: `${courseworkTitle}\n---\n${codeContent.slice(0, 500)}`,
        response: JSON.stringify(graded),
      });

      const [updated] = await db
        .update(submissionsTable)
        .set({
          score: graded.score,
          meetsRequirements: graded.meets_requirements,
          issuesFound: graded.issues_found,
          explanation: graded.explanation,
          correctedSnippet: graded.corrected_snippet,
          flagged,
          status: "graded",
        })
        .where(eq(submissionsTable.id, submission.id))
        .returning();

      results.push({
        id: updated.id,
        studentName: updated.studentName,
        studentId: updated.studentId,
        level: updated.level,
        track: updated.track,
        assignment: {
          id: assignment.id,
          level: assignment.level,
          track: assignment.track,
          prompt: assignment.prompt,
        },
        fileName: updated.fileName,
        codeContent: updated.codeContent,
        score: updated.score,
        meetsRequirements: updated.meetsRequirements,
        issuesFound: (updated.issuesFound as string[]) ?? [],
        explanation: updated.explanation,
        correctedSnippet: updated.correctedSnippet,
        flagged: updated.flagged,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        fixItUrl: `/fix/${updated.id}`,
      });
    } catch (err) {
      req.log.error({ err, submissionId: submission.id }, "Classroom grading error");
      await db
        .update(submissionsTable)
        .set({ status: "failed" })
        .where(eq(submissionsTable.id, submission.id));
    }
  }

  res.status(201).json(results);
});

// ── POST /classroom/post-grades ────────────────────────────────────────────
// Takes EduRithm submission UUIDs, posts assignedGrade + returns each one
// back to the student in Google Classroom.
router.post("/classroom/post-grades", async (req, res) => {
  const tok = googleTokens(req);
  if (!tok) {
    res.status(401).json({ error: "Not connected to Google Classroom." });
    return;
  }

  const { submissionIds } = req.body ?? {};
  if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
    res.status(400).json({ error: "submissionIds must be a non-empty array." });
    return;
  }

  // Load EduRithm submissions that have classroom back-references
  const rows = await db
    .select()
    .from(submissionsTable)
    .where(inArray(submissionsTable.id, submissionIds as string[]));

  const valid = rows.filter(
    (r) => r.classroomSubmissionId && r.classroomCourseId && r.classroomCourseWorkId
  );

  if (valid.length === 0) {
    res.status(422).json({
      error:
        "None of the provided submissions were imported from Google Classroom. " +
        "Only Classroom-imported submissions can have grades sent back.",
    });
    return;
  }

  const results: Array<{
    eduRithmId: string;
    studentName: string;
    score: number | null;
    sent: boolean;
    returned: boolean;
    error?: string;
  }> = [];

  for (const row of valid) {
    const courseId = row.classroomCourseId!;
    const courseWorkId = row.classroomCourseWorkId!;
    const clSubId = row.classroomSubmissionId!;
    const base = `/v1/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`;

    let sent = false;
    let returned = false;
    let errMsg: string | undefined;

    try {
      // 1. Patch the assigned grade
      await gPatch(
        `${base}/${clSubId}?updateMask=assignedGrade`,
        { assignedGrade: row.score ?? 0 },
        tok.accessToken
      );
      sent = true;

      // 2. Return the submission so the student sees it
      await gPost(`${base}/${clSubId}:return`, {}, tok.accessToken);
      returned = true;

      // 3. Mark in DB
      await db
        .update(submissionsTable)
        .set({ classroomGradeSentAt: new Date() })
        .where(eq(submissionsTable.id, row.id));
    } catch (err: any) {
      req.log.error({ err, rowId: row.id }, "post-grades error");
      errMsg = err.message ?? "Unknown error";
    }

    results.push({
      eduRithmId: row.id,
      studentName: row.studentName,
      score: row.score,
      sent,
      returned,
      ...(errMsg ? { error: errMsg } : {}),
    });
  }

  const allOk = results.every((r) => r.sent);
  res.status(allOk ? 200 : 207).json({ results });
});

export default router;
