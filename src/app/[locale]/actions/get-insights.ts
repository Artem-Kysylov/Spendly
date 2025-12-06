"use server";

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { getServerSupabaseClient } from "@/lib/serverSupabase";

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

interface GenerateInsightsParams {
    userId: string;
    startDate: Date;
    endDate: Date;
}

// Simple in-memory cache with TTL
interface CacheEntry {
    data: SpendingInsights;
    timestamp: number;
}

const insightsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper to generate cache key
function getCacheKey(userId: string, startDate: Date, endDate: Date): string {
    return `${userId}_${startDate.toISOString()}_${endDate.toISOString()}`;
}

export async function generateSpendingInsights({
    userId,
    startDate,
    endDate,
}: GenerateInsightsParams): Promise<SpendingInsights> {
    // Check cache first
    const cacheKey = getCacheKey(userId, startDate, endDate);
    const cached = insightsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        console.log('[AI Insights] Returning cached data');
        return cached.data;
    }

    try {
        const supabase = getServerSupabaseClient();

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

        // Group by budget category
        const categoryTotals: Record<
            string,
            { name: string; emoji: string; total: number }
        > = {};

        (currentTransactions || [])
            .filter((t) => t.type === "expense" && t.budget_folders)
            .forEach((t) => {
                const category = (t.budget_folders as any)?.name || "Uncategorized";
                const emoji = (t.budget_folders as any)?.emoji || "📁";

                if (!categoryTotals[category]) {
                    categoryTotals[category] = { name: category, emoji, total: 0 };
                }
                categoryTotals[category].total += t.amount;
            });

        // Prepare context for AI
        const transactionsList = (currentTransactions || [])
            .slice(0, 50) // Limit to last 50 for AI context
            .map((t) => {
                const budgetName = (t.budget_folders as any)?.name || "Uncategorized";
                return `- ${t.title}: $${t.amount.toFixed(2)} (${budgetName}) - ${new Date(t.created_at).toLocaleDateString()}`;
            })
            .join("\n");

        const categorySummary = Object.entries(categoryTotals)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5)
            .map(([_, data]) => `${data.emoji} ${data.name}: $${data.total.toFixed(2)}`)
            .join("\n");

        const trendPercentage =
            previousExpenses > 0
                ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
                : 0;

        const systemPrompt = `You are a financial advisor analyzing spending patterns. Be specific, helpful, and slightly friendly in your advice.

Current Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
Total Spending: $${currentExpenses.toFixed(2)}
Previous Period Spending: $${previousExpenses.toFixed(2)}
Trend: ${trendPercentage > 0 ? "+" : ""}${trendPercentage.toFixed(1)}%

Top Categories:
${categorySummary || "No expenses yet"}

Recent Transactions:
${transactionsList || "No transactions"}

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

        // Clean up old cache entries (simple cleanup on each request)
        for (const [key, entry] of insightsCache.entries()) {
            if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
                insightsCache.delete(key);
            }
        }

        return object;
    } catch (error) {
        console.error('[AI Insights] ERROR:', error);
        console.error('[AI Insights] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

        // Return fallback data
        return {
            trend: {
                direction: "neutral",
                percentage: 0,
                message: "Unable to calculate trend at this time",
            },
            topCategory: {
                name: "General",
                amount: 0,
                emoji: "📊",
                advice: "Keep tracking your expenses to get better insights",
            },
            generalTip: "Start by reviewing your recent transactions to identify spending patterns",
        };
    }
}
