// Robust LLM routing & fallback.
// Simple requests → Gemini 2.5 Flash (fast, cheap, 6s timeout).
// Complex requests → GPT-4-Turbo (deep analysis).
// On any failure of the primary provider, we auto-switch to the other one.

import { fetchGeminiText } from "./google";
import { createOpenAIChatStream } from "./openai";

export type RouterProvider = "google" | "openai";

export interface RouterParams {
  prompt: string;
  system?: string;
  requestId?: string;
  isComplex: boolean;
  locale?: string;
  /**
   * Optional hard override (e.g. AI_PROVIDER env). When set to a provider
   * that has a valid API key, that provider is tried first regardless of
   * complexity. Fallback behaviour is preserved.
   */
  forceProvider?: RouterProvider;
}

export interface RouterSuccess {
  ok: true;
  provider: RouterProvider;
  model: string;
  stream: ReadableStream<string>;
  usedFallback: boolean;
}

export interface RouterFailure {
  ok: false;
  reason: "no_providers" | "all_failed";
  status: number;
  userMessage: string;
  details: string;
}

export type RouterResult = RouterSuccess | RouterFailure;

const FRIENDLY_FALLBACK_MESSAGES: Record<string, string> = {
  en: "Our AI service is temporarily unavailable. Please try again in a moment.",
  ru: "Сервис AI временно недоступен. Пожалуйста, попробуй ещё раз через минуту.",
  uk: "Сервіс AI тимчасово недоступний. Будь ласка, спробуй ще раз за хвилину.",
  ja: "AIサービスが一時的に利用できません。少し経ってから再度お試しください。",
  id: "Layanan AI kami sementara tidak tersedia. Silakan coba lagi sebentar.",
  hi: "हमारी AI सेवा अस्थायी रूप से अनुपलब्ध है। कृपया थोड़ी देर बाद फिर से कोशिश करें।",
  ko: "AI 서비스가 일시적으로 사용 불가능합니다. 잠시 후 다시 시도해 주세요.",
};

export function getFriendlyFallbackMessage(locale?: string): string {
  const base = String(locale ?? "en").toLowerCase().split("-")[0];
  return FRIENDLY_FALLBACK_MESSAGES[base] ?? FRIENDLY_FALLBACK_MESSAGES.en;
}

const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash";
const OPENAI_MODEL_DEFAULT = "gpt-4-turbo";

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? GEMINI_MODEL_DEFAULT;
}

function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL ?? OPENAI_MODEL_DEFAULT;
}

function textToStream(text: string): ReadableStream<string> {
  const CHUNK_SIZE = 48;
  const chunks = text.match(new RegExp(`.{1,${CHUNK_SIZE}}`, "g")) ?? [text];
  const BASE_DELAY = 30;
  const JITTER = 20;
  return new ReadableStream<string>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
        const jitter = Math.floor(Math.random() * JITTER);
        await new Promise((r) => setTimeout(r, BASE_DELAY + jitter));
      }
      controller.close();
    },
  });
}

/**
 * Status codes for which we MUST swap providers. 429 (rate limit),
 * 500/502/503/504 (server/unavailable/gateway/timeout), 0 (network).
 */
function shouldFallback(status: number): boolean {
  return (
    status === 0 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function tryGemini(params: RouterParams): Promise<
  | { ok: true; stream: ReadableStream<string>; model: string }
  | { ok: false; status: number; message: string; model: string }
> {
  const model = getGeminiModel();
  const res = await fetchGeminiText({
    model,
    prompt: params.prompt,
    system: params.system,
    requestId: params.requestId,
  });
  if (res.ok) return { ok: true, stream: textToStream(res.text), model };
  return { ok: false, status: res.status, message: res.message, model };
}

async function tryOpenAI(params: RouterParams): Promise<
  | { ok: true; stream: ReadableStream<string>; model: string }
  | { ok: false; status: number; message: string; model: string }
> {
  const model = getOpenAIModel();
  const res = await createOpenAIChatStream({
    model,
    prompt: params.prompt,
    system: params.system,
    requestId: params.requestId,
  });
  if (res.ok) return { ok: true, stream: res.stream, model };
  return { ok: false, status: res.status, message: res.message, model };
}

export async function streamChatWithFallback(
  params: RouterParams,
): Promise<RouterResult> {
  const hasGoogle = !!process.env.GOOGLE_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasGoogle && !hasOpenAI) {
    console.error("[AI] No LLM providers configured (GOOGLE_API_KEY/OPENAI_API_KEY)");
    return {
      ok: false,
      reason: "no_providers",
      status: 500,
      userMessage: getFriendlyFallbackMessage(params.locale),
      details: "Neither GOOGLE_API_KEY nor OPENAI_API_KEY is configured.",
    };
  }

  // Decide primary provider.
  let primary: RouterProvider;
  if (params.forceProvider === "openai" && hasOpenAI) primary = "openai";
  else if (params.forceProvider === "google" && hasGoogle) primary = "google";
  else if (params.isComplex && hasOpenAI) primary = "openai";
  else if (hasGoogle) primary = "google";
  else primary = "openai";

  const rid = params.requestId ?? "-";

  if (primary === "google") {
    const geminiRes = await tryGemini(params);
    if (geminiRes.ok) {
      console.info(
        `[AI] Gemini ${geminiRes.model} OK (requestId=${rid}, complex=${params.isComplex})`,
      );
      return {
        ok: true,
        provider: "google",
        model: geminiRes.model,
        stream: geminiRes.stream,
        usedFallback: false,
      };
    }

    console.warn(
      `[AI] Gemini failed (Status: ${geminiRes.status}), falling back to GPT-4-Turbo... (requestId=${rid}) details=${geminiRes.message}`,
    );

    if (!hasOpenAI || !shouldFallback(geminiRes.status)) {
      // Non-retryable error OR no OpenAI key — surface friendly error.
      return {
        ok: false,
        reason: "all_failed",
        status: geminiRes.status || 503,
        userMessage: getFriendlyFallbackMessage(params.locale),
        details: `Gemini failed (${geminiRes.message}); OpenAI fallback unavailable.`,
      };
    }

    const openaiRes = await tryOpenAI(params);
    if (openaiRes.ok) {
      console.info(
        `[AI] OpenAI ${openaiRes.model} OK after Gemini fallback (requestId=${rid})`,
      );
      return {
        ok: true,
        provider: "openai",
        model: openaiRes.model,
        stream: openaiRes.stream,
        usedFallback: true,
      };
    }

    console.error(
      `[AI] OpenAI fallback failed (Status: ${openaiRes.status}), both providers unavailable (requestId=${rid}) details=${openaiRes.message}`,
    );
    return {
      ok: false,
      reason: "all_failed",
      status: openaiRes.status || 503,
      userMessage: getFriendlyFallbackMessage(params.locale),
      details: `Gemini failed (${geminiRes.message}); OpenAI failed (${openaiRes.message}).`,
    };
  }

  // primary === "openai"
  const openaiRes = await tryOpenAI(params);
  if (openaiRes.ok) {
    console.info(
      `[AI] OpenAI ${openaiRes.model} OK (requestId=${rid}, complex=${params.isComplex})`,
    );
    return {
      ok: true,
      provider: "openai",
      model: openaiRes.model,
      stream: openaiRes.stream,
      usedFallback: false,
    };
  }

  console.warn(
    `[AI] OpenAI failed (Status: ${openaiRes.status}), falling back to Gemini 2.5 Flash... (requestId=${rid}) details=${openaiRes.message}`,
  );

  if (!hasGoogle || !shouldFallback(openaiRes.status)) {
    return {
      ok: false,
      reason: "all_failed",
      status: openaiRes.status || 503,
      userMessage: getFriendlyFallbackMessage(params.locale),
      details: `OpenAI failed (${openaiRes.message}); Gemini fallback unavailable.`,
    };
  }

  const geminiRes = await tryGemini(params);
  if (geminiRes.ok) {
    console.info(
      `[AI] Gemini ${geminiRes.model} OK after OpenAI fallback (requestId=${rid})`,
    );
    return {
      ok: true,
      provider: "google",
      model: geminiRes.model,
      stream: geminiRes.stream,
      usedFallback: true,
    };
  }

  console.error(
    `[AI] Gemini fallback failed (Status: ${geminiRes.status}), both providers unavailable (requestId=${rid}) details=${geminiRes.message}`,
  );
  return {
    ok: false,
    reason: "all_failed",
    status: geminiRes.status || 503,
    userMessage: getFriendlyFallbackMessage(params.locale),
    details: `OpenAI failed (${openaiRes.message}); Gemini failed (${geminiRes.message}).`,
  };
}
