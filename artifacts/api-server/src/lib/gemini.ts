import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = "gemini-2.5-flash";

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

Grade this submission strictly as a supportive educator. Return ONLY valid JSON with these fields:
- score: integer 0-100
- meets_requirements: boolean (true if score >= 60 and the core requirements are satisfied)
- issues_found: array of short, actionable strings describing specific problems (empty array if none)
- explanation: 2-4 sentences explaining the score and the most important thing to improve
- corrected_snippet: a short corrected HTML snippet illustrating the main fix (or empty string if code is good)

Respond with ONLY the JSON object, no markdown fences.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json", maxOutputTokens: 2048 },
  });

  const raw = response.text ?? "{}";
  const parsed = JSON.parse(raw) as GradingResult;
  return {
    score: Math.min(100, Math.max(0, Math.round(Number(parsed.score) || 0))),
    meets_requirements: Boolean(parsed.meets_requirements),
    issues_found: Array.isArray(parsed.issues_found) ? parsed.issues_found.map(String) : [],
    explanation: String(parsed.explanation || ""),
    corrected_snippet: String(parsed.corrected_snippet || ""),
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

  const contents = [
    { role: "user" as const, parts: [{ text: systemContext }] },
    { role: "model" as const, parts: [{ text: "Understood. I'm ready to help the student understand their feedback." }] },
    ...history.map((m) => ({
      role: m.role === "student" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.content }],
    })),
    { role: "user" as const, parts: [{ text: userMessage }] },
  ];

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { maxOutputTokens: 512 },
  });

  return response.text ?? "I couldn't generate a response. Please try again.";
}
