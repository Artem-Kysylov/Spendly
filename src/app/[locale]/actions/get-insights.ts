"use server";

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { getTranslations } from "next-intl/server";

// Initialize Google AI provider
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
});

// Zod schema for AI insights response
const insightsSchema = z.object({
    trend: z.object({
        direction: z.enum(["up", "down", "neutral"]),
        percentage: z.number(),
        message: z.string(),
    }),
    topCategory: z.object({
        name: z.string(),
        amount: z.number(),
        emoji: z.string(),
        advice: z.string(),
    }),
    generalTip: z.string(),
});

export type SpendingInsights = z.infer<typeof insightsSchema>;

const FREE_DAILY_REQUESTS_LIMIT = 10;
const PRO_DAILY_REQUESTS_LIMIT = 2147483647;

interface GenerateInsightsParams {
    userId: string;
    startDate: Date;
    endDate: Date;
    locale: string;
}

function getUtcDayStartIso(date: Date): string {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
}

async function getIsProUser(opts: {
    userId: string;
}): Promise<boolean> {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("is_pro")
        .eq("id", opts.userId)
        .maybeSingle();

    if (error) return false;
    return (data as { is_pro?: unknown } | null)?.is_pro === true;
}

async function getUsageCountSince(opts: {
    userId: string;
    startIso: string;
}): Promise<number> {
    const supabase = getServerSupabaseClient();
    const { count, error } = await supabase
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", opts.userId)
        .gte("created_at", opts.startIso);

    if (error) return 0;
    return count ?? 0;
}

async function getInsightUsageCount(opts: {
    userId: string;
}): Promise<number> {
    const supabase = getServerSupabaseClient();
    const { count, error } = await supabase
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", opts.userId)
        .eq("request_type", "insight");

    if (error) return 0;
    return count ?? 0;
}

async function ensureDailyRateLimitRow(opts: {
    userId: string;
    isPro: boolean;
    todayStartIso: string;
}): Promise<{ dailyLimit: number; used: number }> {
    const supabase = getServerSupabaseClient();
    const dailyLimit = opts.isPro ? PRO_DAILY_REQUESTS_LIMIT : FREE_DAILY_REQUESTS_LIMIT;

    const { data: current, error: readErr } = await supabase
        .from("ai_rate_limits")
        .select("user_id, daily_requests_limit, daily_requests_count, window_reset_at")
        .eq("user_id", opts.userId)
        .maybeSingle();

    if (readErr) {
        const usedFromLogs = await getUsageCountSince({
            userId: opts.userId,
            startIso: opts.todayStartIso,
        });
        return { dailyLimit, used: usedFromLogs };
    }

    const currentResetIso = current?.window_reset_at
        ? new Date(current.window_reset_at).toISOString()
        : null;
    const needsReset = !currentResetIso || currentResetIso < opts.todayStartIso;

    if (!current) {
        await supabase.from("ai_rate_limits").insert({
            user_id: opts.userId,
            daily_requests_limit: dailyLimit,
            daily_requests_count: 0,
            window_reset_at: opts.todayStartIso,
        });
    } else if (needsReset) {
        await supabase
            .from("ai_rate_limits")
            .update({
                daily_requests_limit: dailyLimit,
                daily_requests_count: 0,
                window_reset_at: opts.todayStartIso,
            })
            .eq("user_id", opts.userId);
    } else if ((current.daily_requests_limit ?? dailyLimit) !== dailyLimit) {
        await supabase
            .from("ai_rate_limits")
            .update({ daily_requests_limit: dailyLimit })
            .eq("user_id", opts.userId);
    }

    const usedRow =
        typeof current?.daily_requests_count === "number" && !needsReset
            ? current.daily_requests_count
            : 0;
    const usedFromLogs = await getUsageCountSince({
        userId: opts.userId,
        startIso: opts.todayStartIso,
    });
    const used = Math.max(usedRow, usedFromLogs);

    if (used !== usedRow) {
        await supabase
            .from("ai_rate_limits")
            .update({ daily_requests_count: used })
            .eq("user_id", opts.userId);
    }

    return { dailyLimit, used };
}

async function incrementDailyUsage(opts: {
    userId: string;
    usedBefore: number;
    dailyLimit: number;
    todayStartIso: string;
}) {
    const supabase = getServerSupabaseClient();
    await supabase
        .from("ai_rate_limits")
        .update({
            daily_requests_limit: opts.dailyLimit,
            daily_requests_count: opts.usedBefore + 1,
            window_reset_at: opts.todayStartIso,
        })
        .eq("user_id", opts.userId);
}

async function insertUsageLog(opts: {
    userId: string;
    model: string;
    promptChars: number;
    completionChars: number;
    success: boolean;
    errorMessage?: string | null;
}) {
    const supabase = getServerSupabaseClient();
    await supabase.from("ai_usage_logs").insert({
        user_id: opts.userId,
        provider: "google",
        model: opts.model,
        request_type: "insight",
        prompt_chars: opts.promptChars,
        completion_chars: opts.completionChars,
        success: opts.success,
        error_message: opts.errorMessage ?? null,
    });
}

// Simple in-memory cache with TTL
interface CacheEntry {
    data: SpendingInsights;
    timestamp: number;
}

const insightsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper to generate cache key
function getCacheKey(
    userId: string,
    startDate: Date,
    endDate: Date,
    locale: string,
): string {
    return `${userId}_${startDate.toISOString()}_${endDate.toISOString()}_${locale}`;
}

function getLanguageName(locale: string): string {
    const base = locale.split("-")[0];
    switch (base) {
        case "ru":
            return "Russian";
        case "uk":
            return "Ukrainian";
        case "ja":
            return "Japanese";
        case "id":
            return "Indonesian";
        case "hi":
            return "Hindi";
        case "ko":
            return "Korean";
        default:
            return "English";
    }
}

export async function generateSpendingInsights({
    userId,
    startDate,
    endDate,
    locale,
}: GenerateInsightsParams): Promise<SpendingInsights> {
    let fallbackCurrentExpenses = 0;
    let fallbackPreviousExpenses = 0;
    let fallbackTrendPercentage = 0;
    let fallbackTopCategory: { name: string; amount: number; emoji: string } | null = null;
    const tFallback = await getTranslations({
        locale,
        namespace: "transactions.aiInsights.aiFallback",
    });

    try {
        const supabase = getServerSupabaseClient();

        const isPro = await getIsProUser({ userId });
        if (!isPro) {
            const usedInsights = await getInsightUsageCount({ userId });
            if (usedInsights >= 1) {
                throw new Error("ai_insights:trial_used");
            }
        }

        const todayStartIso = getUtcDayStartIso(new Date());
        const limits = await ensureDailyRateLimitRow({ userId, isPro, todayStartIso });
        if (!isPro && limits.used >= limits.dailyLimit) {
            throw new Error("ai_insights:daily_limit_reached");
        }

        // Cache check (after paywall/limits)
        const cacheKey = getCacheKey(userId, startDate, endDate, locale);
        const cached = insightsCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log('[AI Insights] Returning cached data');

            await incrementDailyUsage({
                userId,
                usedBefore: limits.used,
                dailyLimit: limits.dailyLimit,
                todayStartIso,
            });

            try {
                const completionChars = JSON.stringify(cached.data).length;
                await insertUsageLog({
                    userId,
                    model: "gemini-2.5-flash",
                    promptChars: 0,
                    completionChars,
                    success: true,
                    errorMessage: null,
                });
            } catch {
                // no-op
            }

            return cached.data;
        }

        console.log('[AI Insights] Starting generation for user:', userId);
        console.log('[AI Insights] Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

        // Calculate previous period dates for comparison
        const periodDays = Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - periodDays);
        const prevEndDate = new Date(startDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);

        // Fetch current period transactions
        const { data: currentTransactions, error: currentError } = await supabase
            .from("transactions")
            .select(
                "id, title, amount, type, created_at, budget_folder_id, budget_folders(name, emoji)",
            )
            .eq("user_id", userId)
            .gte("created_at", startDate.toISOString())
            .lte("created_at", endDate.toISOString())
            .order("created_at", { ascending: false });

        console.log('[AI Insights] Current transactions fetched:', currentTransactions?.length || 0);

        if (currentError) {
            console.error('[AI Insights] Error fetching current transactions:', currentError);
            throw new Error(`Failed to fetch current transactions: ${currentError.message}`);
        }

        // Fetch previous period transactions for trend comparison
        const { data: previousTransactions, error: previousError } = await supabase
            .from("transactions")
            .select("id, amount, type, created_at")
            .eq("user_id", userId)
            .gte("created_at", prevStartDate.toISOString())
            .lte("created_at", prevEndDate.toISOString());

        if (previousError) {
            throw new Error(`Failed to fetch previous transactions: ${previousError.message}`);
        }

        // Calculate totals
        const currentExpenses = (currentTransactions || [])
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

        const previousExpenses = (previousTransactions || [])
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

        fallbackCurrentExpenses = currentExpenses;
        fallbackPreviousExpenses = previousExpenses;

        // Group by budget category
        const categoryTotals: Record<
            string,
            { name: string; emoji: string; total: number }
        > = {};

        (currentTransactions || [])
            .filter((t) => t.type === "expense" && t.budget_folders)
            .forEach((t) => {
                const category = (t.budget_folders as any)?.name || tFallback("uncategorized");
                const emoji = (t.budget_folders as any)?.emoji || "📁";

                if (!categoryTotals[category]) {
                    categoryTotals[category] = { name: category, emoji, total: 0 };
                }
                categoryTotals[category].total += t.amount;
            });

        const sortedCategories = Object.values(categoryTotals).sort(
            (a, b) => b.total - a.total,
        );

        if (sortedCategories.length > 0) {
            const top = sortedCategories[0];
            fallbackTopCategory = {
                name: top.name,
                emoji: top.emoji,
                amount: top.total,
            };
        }

        // Prepare context for AI
        const dateFormatter = new Intl.DateTimeFormat(locale, {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
        const numberFormatter = new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

        const transactionsList = (currentTransactions || [])
            .slice(0, 50)
            .map((t) => {
                const budgetName = (t.budget_folders as any)?.name || tFallback("uncategorized");
                return `- ${t.title}: ${numberFormatter.format(t.amount)} (${budgetName}) - ${dateFormatter.format(new Date(t.created_at))}`;
            })
            .join("\n");

        const categorySummary = sortedCategories
            .slice(0, 5)
            .map((data) => `${data.emoji} ${data.name}: ${numberFormatter.format(data.total)}`)
            .join("\n");

        const trendPercentage =
            previousExpenses > 0
                ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
                : 0;

        fallbackTrendPercentage = trendPercentage;

        const languageName = getLanguageName(locale);
        const systemPrompt = `You are a financial advisor analyzing spending patterns. Be specific, helpful, and slightly friendly in your advice.
IMPORTANT: Respond ONLY in ${languageName} (locale: ${locale}).

Current Period: ${dateFormatter.format(startDate)} - ${dateFormatter.format(endDate)}
Total Spending: $${numberFormatter.format(currentExpenses)}
Previous Period Spending: $${numberFormatter.format(previousExpenses)}
Trend: ${trendPercentage > 0 ? "+" : ""}${trendPercentage.toFixed(1)}%

Top Categories:
${categorySummary || tFallback("noExpensesYet")}

Recent Transactions:
${transactionsList || tFallback("noTransactionsYet")}

Analyze this data and provide:
1. A trend message comparing current vs previous period (be specific about the percentage)
2. Identify the top spending category and give practical, specific advice
3. A short, punchy financial tip based on the actual spending patterns

Be conversational but concise. Use emojis sparingly. Make the advice actionable.`;

        console.log('[AI Insights] Calling Gemini AI...');
        console.log('[AI Insights] Transaction count:', currentTransactions?.length || 0);
        console.log('[AI Insights] Current expenses:', currentExpenses);
        console.log('[AI Insights] Previous expenses:', previousExpenses);

        // Generate AI insights using structured output
        const { object } = await generateObject({
            model: google("gemini-2.5-flash"),
            schema: insightsSchema,
            prompt: systemPrompt,
        });

        console.log('[AI Insights] AI response received:', object);

        // Cache the result
        insightsCache.set(cacheKey, {
            data: object,
            timestamp: Date.now(),
        });

        await incrementDailyUsage({
            userId,
            usedBefore: limits.used,
            dailyLimit: limits.dailyLimit,
            todayStartIso,
        });

        try {
            const completionChars = JSON.stringify(object).length;
            await insertUsageLog({
                userId,
                model: "gemini-2.5-flash",
                promptChars: systemPrompt.length,
                completionChars,
                success: true,
                errorMessage: null,
            });
        } catch {
            // no-op
        }

        // Clean up old cache entries (simple cleanup on each request)
        for (const [key, entry] of insightsCache.entries()) {
            if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
                insightsCache.delete(key);
            }
        }

        return object;
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("ai_insights:")) {
            throw error;
        }
        console.error('[AI Insights] ERROR:', error);
        console.error('[AI Insights] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

        const hasExpensesData = fallbackCurrentExpenses > 0 || fallbackPreviousExpenses > 0;
        const hasTopCategory = !!fallbackTopCategory;

        let direction: "up" | "down" | "neutral" = "neutral";
        if (fallbackTrendPercentage > 1) {
            direction = "up";
        } else if (fallbackTrendPercentage < -1) {
            direction = "down";
        }

        const absTrend = Math.abs(fallbackTrendPercentage);

        const trendMessage = hasExpensesData
            ? direction === "up"
                ? tFallback("trendIncreased", { percent: absTrend.toFixed(1) })
                : direction === "down"
                    ? tFallback("trendDecreased", { percent: absTrend.toFixed(1) })
                    : tFallback("trendFlat")
            : tFallback("noTrendData");

        const topCategory = hasTopCategory
            ? {
                  name: fallbackTopCategory!.name,
                  amount: fallbackTopCategory!.amount,
                  emoji: fallbackTopCategory!.emoji,
                  advice:
                      tFallback("topCategoryAdvice"),
              }
            : {
                  name: tFallback("generalCategoryName"),
                  amount: 0,
                  emoji: "📊",
                  advice: tFallback("generalCategoryAdvice"),
              };

        const generalTip = hasExpensesData
            ? tFallback("generalTipWithData")
            : tFallback("generalTipNoData");

        return {
            trend: {
                direction,
                percentage: hasExpensesData ? fallbackTrendPercentage : 0,
                message: trendMessage,
            },
            topCategory,
            generalTip,
        };
    }
}
