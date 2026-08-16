/**
 * Gemini-powered opportunities feed generator.
 * Called at most once per user (results cached 24 h in DB).
 */

const API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = "gemini-flash-lite-latest";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: "hackathon" | "government" | "oil_gas" | "linkedin" | "certification" | "general";
  platform: string;
  link: string;
  deadline: string;       // ISO date string or "" if unknown
  location: string;
  isRemote: boolean;
  tags: string[];
}

export interface OpportunitiesFeed {
  generatedAt: string;
  userState: string;
  userRegion: string;
  summary: string;
  opportunities: Opportunity[];
  linkedinTips: string[];
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
}

export async function generateOpportunities(
  name: string,
  state: string,
  region: string
): Promise<OpportunitiesFeed> {
  const prompt = `You are a Nigerian tech career advisor. Generate a rich, comprehensive opportunities digest for a student or recent graduate in ${state} State (${region} Nigeria).

Return ONLY a valid JSON object with this exact structure:

{
  "generatedAt": "<ISO timestamp now>",
  "userState": "${state}",
  "userRegion": "${region}",
  "summary": "<2-sentence overview of the tech opportunity landscape in ${region} Nigeria right now>",
  "opportunities": [
    {
      "id": "<unique slug>",
      "title": "<opportunity title>",
      "description": "<2-3 sentences: what it is, who can apply, what they gain>",
      "category": "<one of: hackathon | government | oil_gas | linkedin | certification | general>",
      "platform": "<3MTT | Devpost | NITDA | NNPC | LinkedIn | Coursera | etc>",
      "link": "<real URL if known, else empty string>",
      "deadline": "<YYYY-MM-DD if known, else empty string>",
      "location": "<city/state or 'Remote' or 'Nationwide'>",
      "isRemote": <true|false>,
      "tags": ["<tag1>", "<tag2>"]
    }
  ],
  "linkedinTips": [
    "<actionable LinkedIn tip specifically for Nigerian new tech grads — 1 sentence each>"
  ]
}

Include ALL of these categories (at least 2–3 items per category):

1. HACKATHONS — 3MTT hackathons, Devpost competitions open to Africans/Nigerians, Google Solution Challenge, Microsoft Imagine Cup, local university hackathons. Mention 3MTT specifically as Nigeria's 3 Million Technical Talent programme.

2. GOVERNMENT — NITDA programmes, NCC digital skills, state government tech initiatives in ${region}, NNPC tech scholarships, CBN fintech sandbox, Digital Nigeria programmes, NCDMB local content tech programmes.

3. OIL & GAS TECH — Tech/digital roles and graduate schemes at NNPC, Shell Nigeria, Chevron Nigeria, TotalEnergies Nigeria, Schlumberger/SLB Nigeria, Halliburton Nigeria. Focus on IT, data science, automation, and engineering technology roles. Note which are relevant for ${region} candidates.

4. CERTIFICATION — Free or affordable certifications that improve Nigerian tech job prospects: Google Career Certificates, AWS Cloud Practitioner, Meta Front-End Developer, Cisco NetAcad, Microsoft Learn, Huawei ICT Academy (Huawei has a presence in Nigeria).

5. GENERAL — Other high-value opportunities: ALX Africa programme, Andela (they hire in Nigeria), Semicolon Africa, Ingressive For Good scholarships, remote roles on Toptal/Turing/Braintrust open to Nigerians, startup jobs on Jobberman/MyJobMag tech category.

6. LINKEDIN TIPS — 8–10 specific, actionable tips for Nigerian new tech graduates optimising their LinkedIn profile and job search. Include tips on connecting with recruiters at Nigerian-headquartered tech companies, following key Nigerian tech influencers, using the #OpenToWork feature, writing a compelling headline, and posting work samples.

Make every entry concrete and useful. Prefer real, active programmes. If a link is unknown, use empty string. Respond with ONLY the JSON — no markdown, no commentary.`;

  const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8192, responseMimeType: "application/json" },
    }),
  });

  const data = await res.json() as any;
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${data?.error?.message ?? "unknown"}`);

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Gemini returned no text");

  const parsed = JSON.parse(stripFences(raw)) as OpportunitiesFeed;

  // Ensure every opportunity has an id
  parsed.opportunities = (parsed.opportunities ?? []).map((o, i) => ({
    ...o,
    id: o.id || `opp-${i}`,
    tags: Array.isArray(o.tags) ? o.tags : [],
    link: o.link ?? "",
    deadline: o.deadline ?? "",
    isRemote: Boolean(o.isRemote),
  }));

  parsed.linkedinTips = Array.isArray(parsed.linkedinTips) ? parsed.linkedinTips : [];
  parsed.generatedAt = new Date().toISOString();

  return parsed;
}
