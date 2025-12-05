import { NextRequest } from "next/server";
import { streamOpenAIText } from "@/lib/llm/openai";
import { streamGeminiText } from "@/lib/llm/google";

export async function GET(_req: NextRequest) {
  const requestId =
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const preferredProvider = (process.env.AI_PROVIDER ?? "").toLowerCase();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GOOGLE_API_KEY;

  let provider: "openai" | "gemini" = "gemini";
  if (preferredProvider === "openai" && hasOpenAI) provider = "openai";
  else if (preferredProvider === "gemini" && hasGemini) provider = "gemini";
  else {
    provider = hasOpenAI ? "openai" : "gemini";
  }

  const start = Date.now();
  let ok = false;
  let model =
    provider === "openai"
      ? (process.env.OPENAI_MODEL ?? "gpt-4-turbo")
      : (process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  let error: string | null = null;
  let blockReason: string | null = null;
  let text = "";

  try {
    const stream =
      provider === "openai"
        ? streamOpenAIText({
            model,
            prompt: 'Health check: respond with "pong".',
            system: "You are health-check.",
            requestId,
          })
        : streamGeminiText({
            model,
            prompt: 'Health check: respond with "pong".',
            system: "You are health-check.",
            requestId,
          });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += typeof value === "string" ? value : decoder.decode(value);
      if (text.length > 256) break;
    }
    ok = text.trim().length > 0;
    if (!ok && provider === "gemini" && /Blocked:\s*([A-Z_]+)/i.test(text)) {
      const m = text.match(/Blocked:\s*([A-Z_]+)/i);
      blockReason = m?.[1] ?? null;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown health-check error";
  }

  const durationMs = Date.now() - start;
  const payload = {
    ok,
    provider,
    model,
    durationMs,
    requestId,
    error,
    blockReason,
  };
  return new Response(JSON.stringify(payload), {
    status: ok ? 200 : 503,
    headers: { "Content-Type": "application/json", "X-Request-Id": requestId },
  });
}
