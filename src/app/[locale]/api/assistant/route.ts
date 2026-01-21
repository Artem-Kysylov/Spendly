// Module: /api/assistant
import { NextRequest } from "next/server";
import {
  aiResponse,
  executeTransaction,
  getCanonicalEmptyReply,
  upsertRecurringRule,
} from "@/app/[locale]/actions/aiAssistant";
import { composeLLMPrompt } from "@/prompts/spendlyPal/composeLLMPrompt";
import { PROMPT_VERSION } from "@/prompts/spendlyPal/promptVersion";
import { prepareUserContext } from "@/lib/ai/context";
import { isComplexRequest, selectModel } from "@/lib/ai/routing";
import {
  detectPeriodFromMessage,
  detectIntentFromMessage,
} from "@/lib/ai/intent";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { streamOpenAIText } from "@/lib/llm/openai";
import { streamGeminiText } from "@/lib/llm/google";

// Модульная область файла (добавляем RPM‑щит)
// Минимальный стрим: нарезка строки по частям
function streamText(text: string) {
  const encoder = new TextEncoder();
  const chunks = text.match(/.{1,40}/g) || [text];

  return new Response(
    new ReadableStream({
      start(controller) {
        let i = 0;
        const push = () => {
          if (i >= chunks.length) {
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(chunks[i]));
          i++;
          setTimeout(push, 60);
        };
        push();
      },
    }),
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}

async function verifyUserId(userId: string): Promise<boolean> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    return !!data?.user && !error;
  } catch {
    return false;
  }
}

const FREE_DAILY_REQUESTS_LIMIT = 10;
const PRO_DAILY_REQUESTS_LIMIT = 2147483647;

function getUtcDayStartIso(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getIsProUser(userId: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("is_pro")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;
  return !!data?.is_pro;
}

async function getUsageCountSince(userId: string, startIso: string): Promise<number> {
  const supabase = getServerSupabaseClient();
  const { count, error } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startIso);

  if (error) return 0;
  return count ?? 0;
}

async function getTodayUsageCount(userId: string): Promise<number> {
  const supabase = getServerSupabaseClient();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  const { count, error } = await supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString());

  if (error) {
    return 0;
  }
  return count ?? 0;
}

async function ensureDailyRateLimitRow(opts: {
  userId: string;
  isPro: boolean;
  todayStartIso: string;
}): Promise<{ dailyLimit: number; used: number }> {
  const { userId, isPro, todayStartIso } = opts;
  const supabase = getServerSupabaseClient();
  const dailyLimit = isPro ? PRO_DAILY_REQUESTS_LIMIT : FREE_DAILY_REQUESTS_LIMIT;

  const { data: current, error: readErr } = await supabase
    .from("ai_rate_limits")
    .select("user_id, daily_requests_limit, daily_requests_count, window_reset_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr) {
    const usedFromLogs = await getUsageCountSince(userId, todayStartIso);
    return { dailyLimit, used: usedFromLogs };
  }

  const currentResetIso = current?.window_reset_at
    ? new Date(current.window_reset_at).toISOString()
    : null;
  const needsReset = !currentResetIso || currentResetIso < todayStartIso;

  if (!current) {
    await supabase.from("ai_rate_limits").insert({
      user_id: userId,
      daily_requests_limit: dailyLimit,
      daily_requests_count: 0,
      window_reset_at: todayStartIso,
    });
  } else if (needsReset) {
    await supabase
      .from("ai_rate_limits")
      .update({
        daily_requests_limit: dailyLimit,
        daily_requests_count: 0,
        window_reset_at: todayStartIso,
      })
      .eq("user_id", userId);
  } else if ((current.daily_requests_limit ?? dailyLimit) !== dailyLimit) {
    await supabase
      .from("ai_rate_limits")
      .update({ daily_requests_limit: dailyLimit })
      .eq("user_id", userId);
  }

  const usedRow =
    typeof current?.daily_requests_count === "number" && !needsReset
      ? current.daily_requests_count
      : 0;
  const usedFromLogs = await getUsageCountSince(userId, todayStartIso);
  const used = Math.max(usedRow, usedFromLogs);

  if (used !== usedRow) {
    await supabase
      .from("ai_rate_limits")
      .update({ daily_requests_count: used })
      .eq("user_id", userId);
  }

  return { dailyLimit, used };
}

async function incrementDailyUsage(opts: {
  userId: string;
  usedBefore: number;
  dailyLimit: number;
  todayStartIso: string;
}) {
  const { userId, usedBefore, dailyLimit, todayStartIso } = opts;
  const supabase = getServerSupabaseClient();

  await supabase
    .from("ai_rate_limits")
    .update({
      daily_requests_limit: dailyLimit,
      daily_requests_count: usedBefore + 1,
      window_reset_at: todayStartIso,
    })
    .eq("user_id", userId);
}

async function checkLimits(
  userId: string,
  isPro: boolean,
): Promise<{ ok: boolean; reason?: string; used: number; dailyLimit: number; todayStartIso: string }> {
  if (isPro) return { ok: true, used: 0, dailyLimit: Infinity, todayStartIso: getUtcDayStartIso(new Date()) };

  const todayStartIso = getUtcDayStartIso(new Date());
  const limits = await ensureDailyRateLimitRow({ userId, isPro, todayStartIso });
  if (limits.used >= limits.dailyLimit) {
    return {
      ok: false,
      reason: `Daily limit reached (${limits.dailyLimit} requests). Please try again tomorrow.`,
      used: limits.used,
      dailyLimit: limits.dailyLimit,
      todayStartIso,
    };
  }
  return { ok: true, used: limits.used, dailyLimit: limits.dailyLimit, todayStartIso };
}

async function logUsage(entry: {
  userId: string;
  provider: "openai" | "google";
  model: string;
  promptLength: number;
  responseLength: number;
  success: boolean;
  errorMessage?: string;
  intent?: string;
  period?: string;
  bypassUsed?: boolean;
  blockReason?: string;
  requestType?: "chat" | "action" | "hint";
}) {
  try {
    const supabase = getServerSupabaseClient();
    await supabase.from("ai_usage_logs").insert({
      user_id: entry.userId,
      provider: entry.provider,
      model: entry.model,
      request_type: entry.requestType ?? "chat",
      prompt_chars: entry.promptLength,
      completion_chars: entry.responseLength,
      success: entry.success,
      error_message: entry.errorMessage ?? null,
    });
  } catch {
    // no-op
  }
}

// Проксируем стрим провайдера, одновременно измеряя размер ответа и пишем usage‑лог по завершении
function streamProviderWithUsage(
  providerStream: ReadableStream<string>,
  meta: {
    requestId: string;
    userId: string;
    provider: "openai" | "google";
    model: string;
    promptLength: number;
    intent?: string;
    period?: string;
    locale?: string;
    currency?: string;
    tone?: "neutral" | "friendly" | "formal" | "playful";
    dailyLimit: number;
    usedBefore: number;
    todayStartIso: string;
  },
) {
  const encoder = new TextEncoder();
  let responseLength = 0;
  const debug =
    process.env.LLM_DEBUG === "1" || process.env.LLM_DEBUG === "true";
  const startTs = Date.now();
  let firstChunkTs: number | null = null;

  const out = new ReadableStream({
    start(controller) {
      void incrementDailyUsage({
        userId: meta.userId,
        usedBefore: meta.usedBefore,
        dailyLimit: meta.dailyLimit,
        todayStartIso: meta.todayStartIso,
      });

      const reader = providerStream.getReader();
      const loop = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            if (debug) {
              const durationMs = Date.now() - startTs;
              const ttfbMs = firstChunkTs ? firstChunkTs - startTs : null;
              try {
                console.debug(
                  "[LLM_DEBUG stream]",
                  JSON.stringify({
                    requestId: meta.requestId,
                    provider: meta.provider,
                    model: meta.model,
                    promptLength: meta.promptLength,
                    responseLength,
                    ttfbMs,
                    durationMs,
                    intent: meta.intent,
                    period: meta.period,
                  }),
                );
              } catch {
                /* no-op */
              }
            }
            await logUsage({
              userId: meta.userId,
              provider: meta.provider,
              model: meta.model,
              promptLength: meta.promptLength,
              responseLength,
              success: true,
              intent: meta.intent,
              period: meta.period,
              bypassUsed: false,
              requestType: "chat",
            });
            return;
          }
          const chunk = typeof value === "string" ? value : String(value ?? "");
          responseLength += chunk.length;
          if (firstChunkTs === null) firstChunkTs = Date.now();
          controller.enqueue(encoder.encode(chunk));
          loop();
        } catch (e) {
          controller.error(e);
        }
      };
      loop();
    },
    cancel() {
      // При отмене тоже попробуем залогировать
      void logUsage({
        userId: meta.userId,
        provider: meta.provider,
        model: meta.model,
        promptLength: meta.promptLength,
        responseLength,
        success: false,
        errorMessage: "Stream canceled by client",
        intent: meta.intent,
        period: meta.period,
        bypassUsed: false,
        blockReason: "client_canceled",
        requestType: "chat",
      });
    },
  });

  const usedAfter = Math.min(
    (meta.usedBefore ?? 0) + 1,
    meta.dailyLimit ?? Infinity,
  );

  return new Response(out, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Provider": meta.provider,
      "X-Model": meta.model,
      "X-Request-Id": meta.requestId,
      "X-Prompt-Version": PROMPT_VERSION,
      "X-Intent": meta.intent || "unknown",
      "X-Period": meta.period || "unknown",
      "X-Locale": meta.locale || "en-US",
      "X-Currency": meta.currency || "USD",
      "X-Bypass": "false",
      "X-Tone": meta.tone || "neutral",
      // Новые заголовки для клиента:
      "X-Daily-Limit": String(meta.dailyLimit ?? ""),
      "X-Usage-Used": String(usedAfter),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    userId,
    isPro: _isPro,
    enableLimits: _enableLimits,
    message,
    confirm = false,
    actionPayload,
  } = body || {};
  const actionType: "add_transaction" | "save_recurring_rule" | undefined =
    body?.actionType;
  const tone: "neutral" | "friendly" | "formal" | "playful" =
    body?.tone || "neutral";

  const requestId =
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const debug =
    process.env.LLM_DEBUG === "1" || process.env.LLM_DEBUG === "true";

  if (!userId || !message) {
    return new Response(
      JSON.stringify({ error: "Missing userId or message" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Верификация пользователя из авторизованной сессии
  const isValidUser = await verifyUserId(userId);
  if (!isValidUser) {
    return new Response(JSON.stringify({ error: "Invalid user session." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isPro = await getIsProUser(userId);

  // Защита от злоупотреблений: ограничиваем размер prompt/контекста
  const MAX_PROMPT = Number(process.env.MAX_PROMPT_CHARS ?? "4000");
  const safeMessage = String(message).slice(0, MAX_PROMPT);

  // Парсим локаль и назначаем валюту (MVP: ru -> RUB, иначе USD)
  const acceptLang = req.headers.get("accept-language") || "";
  const locale = acceptLang.split(",")[0] || "en-US";
  const currency = locale.toLowerCase().startsWith("ru") ? "RUB" : "USD";

  // Определяем intent и период
  const intent = detectIntentFromMessage(safeMessage);
  const periodDetected = detectPeriodFromMessage(safeMessage);

  // Check a limits not a pro users
  const limits = await checkLimits(userId, isPro);
  if (!limits.ok) {
    await logUsage({
      userId,
      provider: "google", // по умолчанию
      model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
      promptLength: safeMessage.length,
      responseLength: 0,
      success: false,
      errorMessage: limits.reason,
      requestType: "chat",
    });
    return new Response(JSON.stringify({ error: limits.reason }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "X-Daily-Limit": String(limits.dailyLimit),
        "X-Usage-Used": String(limits.used),
      },
    });
  }

  // Подтверждение — исполняем и отдаём JSON
  if (confirm && actionPayload) {
    if (actionType === "save_recurring_rule") {
      const res = await upsertRecurringRule(userId, actionPayload);
      await logUsage({
        userId,
        provider: "google",
        model: "canonical_action",
        promptLength: 0,
        responseLength: 0,
        success: res.ok,
        intent: "save_recurring_rule",
        requestType: "action",
      });
      return new Response(
        JSON.stringify({
          kind: "message",
          ok: res.ok,
          message: res.message,
          shouldRefetch: false,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const res = await executeTransaction(userId, actionPayload);
    await logUsage({
      userId,
      provider: "google",
      model: "canonical_action",
      promptLength: 0,
      responseLength: 0,
      success: res.ok,
      intent: "add_transaction",
      requestType: "action",
    });
    return new Response(
      JSON.stringify({
        kind: "message",
        ok: res.ok,
        message: res.message,
        shouldRefetch: res.ok,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Сначала проверим, не action ли
  const pre = await aiResponse({
    userId,
    isPro,
    message: safeMessage,
    locale, // передаём текущую локаль
  });
  if (pre.kind === "action") {
    return new Response(JSON.stringify(pre), {
      headers: { "Content-Type": "application/json" },
    });
  } else if (pre.kind === "message" && pre.message && pre.message.trim().length > 0) {
    await logUsage({
      userId,
      provider: "google",
      model: "canonical_pre",
      promptLength: safeMessage.length,
      responseLength: pre.message.length,
      success: true,
      intent,
      period: periodDetected,
      bypassUsed: true,
      requestType: "chat",
    });
    return new Response(JSON.stringify(pre), {
      headers: {
        "Content-Type": "application/json",
        "X-Provider": "google",
        "X-Model": "canonical_pre",
        "X-Request-Id": requestId,
        "X-Daily-Limit": String(limits.dailyLimit),
        "X-Usage-Used": String(Math.min(limits.used + 1, limits.dailyLimit)),
      },
    });
  }

  // Реальный стрим от провайдера
  const ctx = await prepareUserContext(userId);
  const promptRaw = composeLLMPrompt(ctx, safeMessage, {
    locale,
    currency,
    promptVersion: PROMPT_VERSION,
    maxChars: MAX_PROMPT,
    tone,
  });
  const prompt =
    typeof promptRaw === "string" ? promptRaw : String(promptRaw ?? "");

  // Доп. диагностика: тип и первые 200 символов промпта
  if (debug) {
    try {
      console.debug(
        "[LLM_DEBUG prompt sample]",
        JSON.stringify({
          requestId,
          promptType: typeof promptRaw,
          promptLengthChars: prompt.length,
          promptSample: prompt.slice(0, 200),
        }),
      );
    } catch {
      /* no-op */
    }
  }

  // Если prompt подозрительно короткий — используем его как системную директиву, а в user кладём исходное сообщение
  const isPromptTooShort = prompt.trim().length < 128;
  const systemDefault =
    "You are the Spendly assistant. Respond directly to the user request. Use the provided Weekly and Monthly sections depending on the request. Do not give application instructions, onboarding, UI steps, or how-to guides. Do not include greetings or introductions. Answer in plain text.";
  const systemForLLM = isPromptTooShort ? prompt : systemDefault;
  const promptForLLM = isPromptTooShort ? safeMessage : prompt;

  // Канонический ответ при пустых данных за период: отвечаем без LLM
  const canonical = getCanonicalEmptyReply(ctx, safeMessage, { locale });
  if (canonical.shouldBypass) {
    if (debug) {
      const approxTokens = Math.round(prompt.length / 4);
      console.debug(
        "[LLM_DEBUG canonical pre-call]",
        JSON.stringify({
          requestId,
          userId,
          provider: "canonical",
          model: "canonical",
          promptVersion: PROMPT_VERSION,
          promptLengthChars: prompt.length,
          approxTokens,
          intent,
          period: canonical.period,
          bypassUsed: true,
        }),
      );
    }

    // Возвращаем JSON‑контракт (этап 1 локализации: ключи EN, текст UI строит сам)
    const jsonContract = {
      intent: "summary",
      period: canonical.period,
      currency,
      totals: { expenses: 0 },
      breakdown: [],
      topExpenses: [],
      text: "",
      meta: {
        promptVersion: PROMPT_VERSION,
        locale,
        tokensApprox: Math.round(prompt.length / 4),
      },
    };

    await logUsage({
      userId,
      provider: "google",
      model: "canonical",
      promptLength: prompt.length,
      responseLength: JSON.stringify(jsonContract).length,
      success: true,
      intent,
      period: canonical.period,
      bypassUsed: true,
      requestType: "chat",
    });

    return new Response(JSON.stringify(jsonContract), {
      headers: {
        "Content-Type": "application/json",
        "X-Provider": "google",
        "X-Model": "canonical",
        "X-Request-Id": requestId,
        "X-Prompt-Version": PROMPT_VERSION,
        "X-Intent": intent,
        "X-Period": canonical.period,
        "X-Locale": locale,
        "X-Currency": currency,
        "X-Bypass": "true",
        // Новые заголовки usage:
        "X-Daily-Limit": String(limits.dailyLimit),
        "X-Usage-Used": String(Math.min(limits.used + 1, limits.dailyLimit)),
      },
    });
  }

  const complex = isComplexRequest(safeMessage);

  const preferredProvider = (process.env.AI_PROVIDER ?? "").toLowerCase();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GOOGLE_API_KEY;

  let provider: "openai" | "google" = "google";
  if (preferredProvider === "openai" && hasOpenAI) provider = "openai";
  else if (preferredProvider === "gemini" && hasGemini) provider = "google";
  else {
    // Авто по сложности: OpenAI для комплексных, иначе Gemini
    provider = complex && hasOpenAI ? "openai" : "google";
  }

  if (debug) {
    try {
      const approxTokens = Number.isFinite(prompt.length)
        ? Math.round(prompt.length / 4)
        : null;
      console.debug(
        "[LLM_DEBUG pre-call]",
        JSON.stringify({
          requestId,
          userId,
          provider,
          model:
            provider === "openai"
              ? (process.env.OPENAI_MODEL ?? "gpt-4-turbo")
              : (process.env.GEMINI_MODEL ?? "gemini-2.5-flash"),
          promptVersion: PROMPT_VERSION,
          promptLengthChars: prompt.length,
          approxTokens,
          intent,
          period: periodDetected,
          bypassUsed: false,
          promptTooShort: isPromptTooShort,
        }),
      );
    } catch {
      // no-op
    }
  }

  try {
    if (provider === "openai") {
      const model = process.env.OPENAI_MODEL ?? "gpt-4-turbo";
      const stream = streamOpenAIText({
        model,
        prompt: promptForLLM,
        system: systemForLLM,
        requestId,
      });
      return streamProviderWithUsage(stream, {
        requestId,
        userId,
        provider: "openai",
        model,
        promptLength: prompt.length,
        intent,
        period: periodDetected,
        locale,
        currency,
        tone,
        dailyLimit: limits.dailyLimit,
        usedBefore: limits.used,
        todayStartIso: limits.todayStartIso,
      });
    } else {
      const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
      const stream = streamGeminiText({
        model,
        prompt: promptForLLM,
        system: systemForLLM,
        requestId,
      });
      return streamProviderWithUsage(stream, {
        requestId,
        userId,
        provider: "google",
        model,
        promptLength: prompt.length,
        intent,
        period: periodDetected,
        locale,
        currency,
        tone,
        dailyLimit: limits.dailyLimit,
        usedBefore: limits.used,
        todayStartIso: limits.todayStartIso,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown provider error";

    // Корректная отдача 429/503 от Gemini без fallback на OpenAI
    const isGemini429 =
      provider === "google" && typeof msg === "string" && /^GeminiHttp:429/.test(msg);
    const isGemini503 =
      provider === "google" && typeof msg === "string" && /^GeminiHttp:503/.test(msg);

    await logUsage({
      userId,
      provider,
      model:
        provider === "openai"
          ? (process.env.OPENAI_MODEL ?? "gpt-4-turbo")
          : (process.env.GEMINI_MODEL ?? "gemini-2.5-flash"),
      promptLength: prompt.length,
      responseLength: 0,
      success: false,
      errorMessage: msg,
      intent,
      period: periodDetected,
      bypassUsed: false,
      blockReason: isGemini429
        ? "rate_limited"
        : isGemini503
          ? "unavailable"
          : "provider_error",
      requestType: "chat",
    });

    if (isGemini429 || isGemini503) {
      const status = isGemini429 ? 429 : 503;
      const payload = {
        error: isGemini429 ? "provider_rate_limited" : "provider_unavailable",
        message:
          isGemini429
            ? "Gemini is rate-limited. Please try again later."
            : "Gemini service is temporarily unavailable. Please try again later.",
      };
      return new Response(JSON.stringify(payload), {
        status,
        headers: {
          "Content-Type": "application/json",
          "X-Provider": "google",
          "X-Model": process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
          "X-Request-Id": requestId,
        },
      });
    }

    // Прочие ошибки — 500
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Модульная область файла (добавляем RPM‑щит)
const GEMINI_RPM_LIMIT = Number(process.env.GEMINI_RPM_LIMIT ?? "5");
const RPM_WINDOW_MS = 60_000;

type RpmState = { windowStart: number; count: number };
const geminiRpm: RpmState = { windowStart: Date.now(), count: 0 };

function checkGeminiRpm(): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (now - geminiRpm.windowStart >= RPM_WINDOW_MS) {
    geminiRpm.windowStart = now;
    geminiRpm.count = 0;
  }
  if (geminiRpm.count >= GEMINI_RPM_LIMIT) {
    const retryAfterSec = Math.ceil(
      (geminiRpm.windowStart + RPM_WINDOW_MS - now) / 1000,
    );
    return { ok: false, retryAfterSec };
  }
  geminiRpm.count += 1;
  return { ok: true, retryAfterSec: 0 };
}