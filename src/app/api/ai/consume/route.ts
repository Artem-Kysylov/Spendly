import { NextRequest } from "next/server";
import { getAuthenticatedClient, getServerSupabaseClient } from "@/lib/serverSupabase";

const FREE_DAILY_REQUESTS_LIMIT = 10;
const PRO_DAILY_REQUESTS_LIMIT = 2147483647;

type RequestType = "chat" | "action" | "hint";

type ConsumeRequestBody = {
  requestType?: RequestType;
  promptChars?: number;
};

type RateLimitRow = {
  user_id: string;
  daily_requests_limit: number | null;
  daily_requests_count: number | null;
  window_reset_at: string | null;
};

function getUtcDayStartIso(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

async function getIsProUser(userId: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;
  if (!data || typeof data !== "object") return false;
  const isPro = (data as { is_pro?: unknown }).is_pro;
  return isPro === true;
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

  const row = (current ?? null) as RateLimitRow | null;
  const currentResetIso = row?.window_reset_at ? new Date(row.window_reset_at).toISOString() : null;
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
  } else if ((row?.daily_requests_limit ?? dailyLimit) !== dailyLimit) {
    await supabase
      .from("ai_rate_limits")
      .update({ daily_requests_limit: dailyLimit })
      .eq("user_id", userId);
  }

  const usedRow =
    typeof row?.daily_requests_count === "number" && !needsReset
      ? row.daily_requests_count
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

async function insertUsageLog(opts: {
  userId: string;
  model: string;
  requestType: RequestType;
  promptChars: number;
  completionChars?: number | null;
  success: boolean;
  errorMessage?: string | null;
}) {
  const { userId, model, requestType, promptChars, completionChars, success, errorMessage } = opts;
  const supabase = getServerSupabaseClient();

  await supabase.from("ai_usage_logs").insert({
    user_id: userId,
    provider: "google",
    model,
    request_type: requestType,
    prompt_chars: promptChars,
    completion_chars: completionChars ?? null,
    success,
    error_message: errorMessage ?? null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(req);
    const rawBody = (await req.json().catch(() => null)) as unknown;
    const body: ConsumeRequestBody =
      rawBody && typeof rawBody === "object" ? (rawBody as ConsumeRequestBody) : {};

    const userId = user.id;
    const requestType: RequestType =
      body.requestType === "chat" || body.requestType === "action" || body.requestType === "hint"
        ? body.requestType
        : "chat";
    const promptChars = typeof body.promptChars === "number" ? body.promptChars : 0;

    const isPro = await getIsProUser(userId);
    const todayStartIso = getUtcDayStartIso(new Date());
    const limits = await ensureDailyRateLimitRow({ userId, isPro, todayStartIso });

    if (!isPro && limits.used >= limits.dailyLimit) {
      try {
        await insertUsageLog({
          userId,
          model: "local_parser",
          requestType,
          promptChars,
          completionChars: null,
          success: false,
          errorMessage: "Daily limit reached",
        });
      } catch {
      }

      return new Response(
        JSON.stringify({ code: "limitReached" }),
        {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "X-Daily-Limit": String(limits.dailyLimit),
          "X-Usage-Used": String(limits.used),
        },
        },
      );
    }

    await incrementDailyUsage({
      userId,
      usedBefore: limits.used,
      dailyLimit: limits.dailyLimit,
      todayStartIso,
    });

    try {
      await insertUsageLog({
        userId,
        model: "local_parser",
        requestType,
        promptChars,
        completionChars: null,
        success: true,
        errorMessage: null,
      });
    } catch {
    }

    return new Response(
      JSON.stringify({ ok: true, used: limits.used + 1, limit: limits.dailyLimit }),
      {
        headers: {
          "Content-Type": "application/json",
          "X-Daily-Limit": String(limits.dailyLimit),
          "X-Usage-Used": String(limits.used + 1),
        },
      },
    );
  } catch {
    return new Response(JSON.stringify({ code: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
