/**
 * Gemini REST helper — uses the v1beta REST endpoint directly so we are not
 * coupled to any particular version of the @google/genai SDK.
 */

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) throw new Error("GEMINI_API_KEY is required");

// gemini-flash-lite-latest is a stable alias confirmed working with this API key.
const MODEL = "gemini-flash-lite-latest";
const BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text: string;
}
interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}
interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { code: number; message: string; status: string };
}

async function callGemini(
  contents: GeminiContent[],
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const url = `${BASE}/${MODEL}:generateContent?key=${API_KEY}`;

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 2048,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as GeminiResponse;

  if (!res.ok) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Gemini API error ${res.status}: ${msg}`);
  }

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked request: ${data.promptFeedback.blockReason}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error(
      `Gemini returned no text. finishReason=${data.candidates?.[0]?.finishReason ?? "unknown"}`
    );
  }

  return text;
}

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

// ─── Public types and functions ────────────────────────────────────────────

export interface GradingResult {
  score: number;
  meets_requirements: boolean;
  issues_found: string[];
  explanation: string;
  corrected_snippet: string;
}

// ── Batch grading ──────────────────────────────────────────────────────────
// Sends up to ~30 submissions in one Gemini call so the model can grade
// consistently relative to the whole class and surface class-wide patterns.

export interface BatchSubmissionInput {
  index: number;         // 0-based, used to match response back to submission
  studentName: string;
  fileName: string;
  codeContent: string;
}

export interface BatchGradingResult extends GradingResult {
  index: number;
}

export interface ClassInsights {
  common_mistakes: string[];   // issues seen in >1 submission
  class_summary: string;       // 2-3 sentence overview of the cohort's work
  top_recommendation: string;  // the single most impactful thing to teach next
}

export interface BatchGradingResponse {
  grades: BatchGradingResult[];
  class_insights: ClassInsights;
}

export async function gradeBatch(
  assignmentPrompt: string,
  submissions: BatchSubmissionInput[]
): Promise<BatchGradingResponse> {
  const submissionsBlock = submissions
    .map(
      (s) =>
        `--- SUBMISSION ${s.index} | Student: ${s.studentName} | File: ${s.fileName} ---\n\`\`\`\n${s.codeContent}\n\`\`\``
    )
    .join("\n\n");

  const prompt = `You are an expert HTML/CSS/JavaScript instructor grading a class of ${submissions.length} student submission(s).
Grade ALL submissions consistently — a score of 70 from one student should mean the same standard as 70 from another.

ASSIGNMENT PROMPT:
${assignmentPrompt}

${submissionsBlock}

Return ONLY valid JSON with exactly this shape:
{
  "grades": [
    {
      "index": <integer matching the submission index above>,
      "score": <integer 0-100>,
      "meets_requirements": <boolean, true if score >= 60 and core requirements present>,
      "issues_found": [<short actionable strings>],
      "explanation": "<2-4 sentences: score rationale + most important improvement>",
      "corrected_snippet": "<short corrected HTML snippet for the main fix, or empty string>"
    }
  ],
  "class_insights": {
    "common_mistakes": [<issues that appeared in more than one submission>],
    "class_summary": "<2-3 sentences about overall class performance>",
    "top_recommendation": "<the single most impactful concept to re-teach>"
  }
}

Students are beginners — structural mistakes are expected. Grade fairly but helpfully.
Respond with ONLY the JSON object. No markdown fences, no extra text.`;

  // Large output budget: ~600 tokens per submission + 500 for class insights
  const maxTokens = Math.min(32768, submissions.length * 700 + 600);

  const raw = await callGemini(
    [{ role: "user", parts: [{ text: prompt }] }],
    { json: true, maxTokens }
  );

  const parsed = JSON.parse(stripJsonFences(raw)) as BatchGradingResponse;

  const grades: BatchGradingResult[] = (parsed.grades ?? []).map((g) => ({
    index: Number(g.index ?? 0),
    score: Math.min(100, Math.max(0, Math.round(Number(g.score) || 0))),
    meets_requirements: Boolean(g.meets_requirements),
    issues_found: Array.isArray(g.issues_found) ? g.issues_found.map(String) : [],
    explanation: String(g.explanation || ""),
    corrected_snippet: String(g.corrected_snippet || ""),
  }));

  const ci = parsed.class_insights ?? {};
  return {
    grades,
    class_insights: {
      common_mistakes: Array.isArray(ci.common_mistakes) ? ci.common_mistakes.map(String) : [],
      class_summary: String(ci.class_summary || ""),
      top_recommendation: String(ci.top_recommendation || ""),
    },
  };
}

// ── IDE Assist ─────────────────────────────────────────────────────────────
// Real-time Gemini guidance inside the student's live code editor.

export async function ideAssist(
  conceptTitle: string,
  conceptExplanation: string,
  currentCode: string,
  history: Array<{ role: "student" | "assistant"; content: string }>,
  question: string,
  sessionGoal?: string   // optional: curriculum goal for this study session
): Promise<string> {
  const goalLine = sessionGoal
    ? `\nStudent's session goal: "${sessionGoal}"\nKeep this goal in mind — if they haven't achieved it yet, gently nudge them toward it. When they do, celebrate it and remind them there's a next topic waiting.`
    : "";

  const system = `You are EduRithm's friendly coding tutor helping a Nigerian university student learn ${conceptTitle}.
The student is working in a live browser-based code editor and can see the result instantly.

Current concept: ${conceptTitle}
${conceptExplanation ? `Concept explanation: ${conceptExplanation}` : ""}
Student's current code:
\`\`\`
${currentCode.slice(0, 2500)}
\`\`\`
${goalLine}
Rules:
- Be warm, encouraging, and concrete. Max 130 words unless showing code.
- If asked for a challenge, give ONE specific, achievable coding task. If a session goal exists, align the challenge with it.
- If asked to check their code, evaluate it against the last challenge you gave.
- Reference their actual code when pointing out issues.
- Use short paragraphs. Nigerian students — practical, real-world framing helps.`;

  const contents: GeminiContent[] = [
    { role: "user", parts: [{ text: system }] },
    { role: "model", parts: [{ text: `Ready to help with ${conceptTitle}! Ask me anything or say "challenge me" to get a practice task.` }] },
    ...history.map((h) => ({
      role: (h.role === "student" ? "user" : "model") as "user" | "model",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: question }] },
  ];

  return callGemini(contents, { maxTokens: 600 });
}

// ── IDE Assist: updated signature with optional session goal ─────────────────
// (See ideAssist above — sessionGoal wires curriculum context into the chat)

// ── Student onboarding ──────────────────────────────────────────────────────
// Generates a personalised welcome message + full 3-week structured curriculum.

export interface CurriculumTopic {
  title: string;   // short concept name
  what: string;    // one sentence: what the student will understand
  goal: string;    // one sentence: concrete coding task / challenge
  ytSearch: string; // YouTube search query (NOT a URL)
}

export interface CurriculumWeek {
  week: number;
  theme: string;
  topics: CurriculumTopic[];
}

export interface Curriculum {
  title: string;
  weeks: CurriculumWeek[];
}

export interface OnboardResult {
  message: string;
  curriculum: Curriculum;
  recommendedConcepts: string[];
}

export async function onboardStudent(
  level: string,
  track: string
): Promise<OnboardResult> {
  const trackName = { html: "HTML", css: "CSS", javascript: "JavaScript", python: "Python" }[track] ?? track;

  const prompt = `You are EduRithm's AI curriculum designer for Nigerian university students.

Student profile:
- Level: ${level}  (beginner = brand-new to coding; intermediate = knows some basics; advanced = comfortable with fundamentals)
- Track: ${trackName}

TASK 1 — Welcome message (2-3 sentences):
- Warm and exciting, acknowledging their level and track
- Mention what they will BUILD or ACCOMPLISH over the 3 weeks
- Include a practical Nigerian context sentence (fintech, startups, jobs, etc.)

TASK 2 — 3-week structured curriculum:
Design exactly 3 weeks, each with exactly 3 topics appropriate for this level and track.
Week 1 = foundations, Week 2 = building real things, Week 3 = project / real-world application.

Each topic must have:
- title: a short, clear concept name (e.g. "HTML Links & Images")
- what: one sentence — what the student will understand after this topic
- goal: one concrete coding challenge they should complete (be specific, e.g. "Build a navigation bar with 4 links that change colour on hover")
- ytSearch: a good YouTube search query to find a tutorial video (e.g. "HTML links and images tutorial for beginners 2024")

TASK 3 — recommend 1-3 existing concept titles from this list that match Week 1:
HTML Structure & Basics, HTML Tables, Inline CSS, Internal CSS, CSS Colors, CSS Text & Typography, Python Variables, Python print(), Python if/elif/else, Python Loops

Return ONLY valid JSON, no markdown fences:
{
  "message": "...",
  "curriculum": {
    "title": "${level.charAt(0).toUpperCase() + level.slice(1)} ${trackName} Path — 3 Weeks",
    "weeks": [
      {
        "week": 1,
        "theme": "...",
        "topics": [
          { "title": "...", "what": "...", "goal": "...", "ytSearch": "..." },
          { "title": "...", "what": "...", "goal": "...", "ytSearch": "..." },
          { "title": "...", "what": "...", "goal": "...", "ytSearch": "..." }
        ]
      },
      { "week": 2, "theme": "...", "topics": [ ... ] },
      { "week": 3, "theme": "...", "topics": [ ... ] }
    ]
  },
  "recommendedConcepts": ["...", "..."]
}`;

  const raw = await callGemini(
    [{ role: "user", parts: [{ text: prompt }] }],
    { json: true, maxTokens: 2048 }
  );

  const parsed = JSON.parse(stripJsonFences(raw));

  // Normalise curriculum structure defensively
  const rawWeeks: CurriculumWeek[] = Array.isArray(parsed.curriculum?.weeks)
    ? parsed.curriculum.weeks.map((w: any) => ({
        week: Number(w.week ?? 1),
        theme: String(w.theme ?? ""),
        topics: Array.isArray(w.topics)
          ? w.topics.map((t: any) => ({
              title: String(t.title ?? ""),
              what: String(t.what ?? ""),
              goal: String(t.goal ?? ""),
              ytSearch: String(t.ytSearch ?? `${trackName} ${t.title ?? ""} tutorial`),
            }))
          : [],
      }))
    : [];

  return {
    message: String(parsed.message || `Welcome to EduRithm! Let's start your ${trackName} journey.`),
    curriculum: {
      title: String(parsed.curriculum?.title ?? `${level} ${trackName} Path`),
      weeks: rawWeeks,
    },
    recommendedConcepts: Array.isArray(parsed.recommendedConcepts)
      ? parsed.recommendedConcepts.map(String)
      : [],
  };
}

export async function gradeHtml(
  assignmentPrompt: string,
  fileName: string,
  codeContent: string
): Promise<GradingResult> {
  const prompt = `You are an expert HTML/CSS/JavaScript instructor grading a student's submission.

ASSIGNMENT PROMPT:
${assignmentPrompt}

STUDENT FILE: ${fileName}
STUDENT CODE:
\`\`\`html
${codeContent}
\`\`\`

Grade this submission as a supportive educator. Students are beginners — invalid tags, missing attributes, and structural mistakes are expected and should be graded, NOT rejected.

Return ONLY valid JSON with exactly these fields:
- "score": integer 0-100
- "meets_requirements": boolean (true if score >= 60 and core requirements are present)
- "issues_found": array of short actionable strings describing specific problems (empty array if none)
- "explanation": 2-4 sentences explaining the score and the single most important improvement
- "corrected_snippet": a short corrected HTML snippet illustrating the main fix (empty string if code is already good)

Respond with ONLY the JSON object. No markdown fences, no extra text.`;

  const raw = await callGemini(
    [{ role: "user", parts: [{ text: prompt }] }],
    { json: true, maxTokens: 2048 }
  );

  const parsed = JSON.parse(stripJsonFences(raw)) as GradingResult;
  return {
    score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0))),
    meets_requirements: Boolean(parsed.meets_requirements),
    issues_found: Array.isArray(parsed.issues_found)
      ? parsed.issues_found.map(String)
      : [],
    explanation: String(parsed.explanation || ""),
    corrected_snippet: String(parsed.corrected_snippet || ""),
  };
}

export interface ReviewResult {
  score: number;
  meetsBaseline: boolean;
  issuesFound: string[];
  highlights: string[];
  explanation: string;
  correctedSnippet: string;
}

export async function reviewHtmlOpen(
  fileName: string,
  codeContent: string
): Promise<ReviewResult> {
  const prompt = `You are an expert HTML/CSS/JavaScript instructor reviewing a student's web page submission.

STUDENT FILE: ${fileName}
STUDENT CODE:
\`\`\`html
${codeContent}
\`\`\`

Review this code on its own merits — there is no specific assignment. Assess the quality of the HTML structure, semantics, CSS (if present), and JavaScript (if present) as a supportive educator would.

Return ONLY valid JSON with exactly these fields:
- "score": integer 0-100 reflecting overall code quality
- "meetsBaseline": boolean — true if the code is a reasonable, working HTML page (score >= 50)
- "issuesFound": array of short actionable strings for specific problems (empty if none)
- "highlights": array of short strings praising specific things done well (empty if nothing stands out)
- "explanation": 2-4 sentences summarising the overall quality and the single most important improvement
- "correctedSnippet": a short corrected HTML snippet illustrating the main fix (empty string if no fix needed)

Respond with ONLY the JSON object. No markdown fences, no extra text.`;

  const raw = await callGemini(
    [{ role: "user", parts: [{ text: prompt }] }],
    { json: true, maxTokens: 2048 }
  );

  const parsed = JSON.parse(stripJsonFences(raw)) as ReviewResult;
  return {
    score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0))),
    meetsBaseline: Boolean(parsed.meetsBaseline),
    issuesFound: Array.isArray(parsed.issuesFound) ? parsed.issuesFound.map(String) : [],
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(String) : [],
    explanation: String(parsed.explanation || ""),
    correctedSnippet: String(parsed.correctedSnippet || ""),
  };
}

export async function chatAboutCode(
  assignmentPrompt: string,
  codeContent: string,
  gradingExplanation: string,
  history: Array<{ role: "student" | "assistant"; content: string }>,
  userMessage: string
): Promise<string> {
  const systemContext = `You are a supportive coding tutor helping a student understand feedback on their HTML assignment.

ASSIGNMENT: ${assignmentPrompt}
SUBMITTED CODE:
\`\`\`html
${codeContent.slice(0, 3000)}
\`\`\`
GRADING FEEDBACK: ${gradingExplanation}

Answer the student's question concisely and helpfully. Focus on the specific thing they are asking about. Be encouraging but honest. Do not rewrite their entire solution — guide them toward understanding. Keep your response under 200 words.`;

  const contents: GeminiContent[] = [
    { role: "user", parts: [{ text: systemContext }] },
    {
      role: "model",
      parts: [
        {
          text: "Understood. I'm ready to help the student understand their feedback.",
        },
      ],
    },
    ...history.map((m) => ({
      role: m.role === "student" ? "user" : "model",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  return callGemini(contents, { maxTokens: 512 });
}
