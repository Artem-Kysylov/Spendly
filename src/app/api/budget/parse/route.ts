import { NextRequest } from "next/server";
import { getAuthenticatedClient } from "@/lib/serverSupabase";
import { streamGeminiText } from "@/lib/llm/google";

async function streamToString(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += value;
  }
  return out;
}

function extractFirstJsonObject(text: string): string | null {
  const s = String(text || "").trim();
  const firstBrace = s.indexOf("{");
  const lastBrace = s.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return s.slice(firstBrace, lastBrace + 1);
}

function normalizeAmount(input: unknown): number {
  if (typeof input === "number") return input;
  const raw = String(input ?? "").trim();
  if (!raw) return Number.NaN;
  const n = Number(raw.replace(/,/g, "."));
  return Number.isFinite(n) ? n : Number.NaN;
}

export async function POST(req: NextRequest) {
  try {
    await getAuthenticatedClient(req);

    const body = (await req.json().catch(() => null)) as unknown;
    const message =
      body && typeof body === "object" && typeof (body as any).message === "string"
        ? String((body as any).message)
        : "";

    if (!message.trim()) {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a specialized multilingual budget parser for a personal finance app.

Your task: extract budget data from the user message in ANY language and return ONLY a valid JSON object (no markdown, no extra text).

Return schema (JSON only):
{
  "name": string,
  "amount": number,
  "type": "expense" | "income",
  "emoji": string,
  "color": string | null,
  "period": "monthly"
}

Rules:
- name: category name, properly capitalized for the language.
- amount: extract numeric value. Convert comma decimals to dot (e.g. "12,5" -> 12.5).
- type: default "expense" unless the message clearly indicates income.
- emoji: choose one relevant emoji for the category.
- color: default null.
- period: always "monthly".

IMPORTANT: Output ONLY the JSON object. No explanations.`;

    const stream = streamGeminiText({
      model: "gemini-2.5-flash",
      prompt: message,
      system: systemPrompt,
      requestId: `budget-parse-${Date.now()}`,
    });

    const raw = await streamToString(stream);
    const jsonText = extractFirstJsonObject(raw);
    if (!jsonText) {
      return new Response(JSON.stringify({ error: "Failed to parse budget" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return new Response(JSON.stringify({ error: "Failed to parse budget" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    const amount = normalizeAmount(parsed?.amount);
    const type: "expense" | "income" =
      parsed?.type === "income" ? "income" : "expense";
    const emoji = typeof parsed?.emoji === "string" ? parsed.emoji.trim() : "";

    if (!name || !Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Failed to parse budget" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        name,
        amount,
        type,
        emoji: emoji || "💰",
        color: null,
        period: "monthly",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
