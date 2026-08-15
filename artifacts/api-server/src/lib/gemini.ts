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
