import { Issue, Settings } from "./types";

const SYSTEM_PROMPT =
  "You are a professional editor. Analyze the provided text for grammar errors, style issues, " +
  "tone problems, structural weaknesses, and clarity improvements. Return ONLY a JSON array of " +
  "issue objects with no additional text. Each object must have: category (one of: grammar, style, " +
  "tone, structure, clarity), original (the exact verbatim text that has the issue), suggestion " +
  "(the corrected text), explanation (one sentence explaining the issue).";

function getEndpoint(settings: Settings): string {
  if (settings.provider === "claude") return "https://api.anthropic.com/v1/messages";
  if (settings.provider === "openai") return "https://api.openai.com/v1/chat/completions";
  const base = settings.customBaseUrl!.replace(/\/$/, "");
  return `${base}/chat/completions`;
}

function buildRequest(text: string, settings: Settings): RequestInit {
  if (settings.provider === "claude") {
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: settings.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    };
  }
  // OpenAI and custom (OpenAI-compatible)
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  };
}

function extractText(data: unknown, settings: Settings): string {
  if (settings.provider === "claude") {
    const d = data as { content: { type: string; text: string }[] };
    return d.content.find((b) => b.type === "text")?.text ?? "";
  }
  const d = data as { choices: { message: { content: string } }[] };
  return d.choices?.[0]?.message?.content ?? "";
}

async function attemptCall(text: string, settings: Settings): Promise<Issue[]> {
  const response = await fetch(getEndpoint(settings), buildRequest(text, settings));

  if (response.status === 401) throw new Error("Invalid API key. Check Settings.");
  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  const raw = extractText(data, settings);
  const json = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  return JSON.parse(json) as Issue[];
}

export async function callProofreadAPI(text: string, settings: Settings): Promise<Issue[]> {
  try {
    try {
      return await attemptCall(text, settings);
    } catch (err) {
      if (err instanceof SyntaxError) {
        // Retry once on malformed JSON
        return await attemptCall(text, settings);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Could not reach the API. Check your connection.");
    }
    if (err instanceof SyntaxError) {
      throw new Error("Unexpected response from API");
    }
    throw err;
  }
}
