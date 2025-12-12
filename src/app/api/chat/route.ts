import { NextRequest } from "next/server";
import { streamText, tool } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { getTranslations } from "next-intl/server";

// Initialize Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export const maxDuration = 60;

// Zod Schema for transaction proposal
const proposeTransactionSchema = z.object({
  transactions: z.array(
    z.object({
      title: z.string().describe('Short description of the transaction (e.g., "Gas Station", "Coffee")'),
      amount: z.number().describe("Transaction amount (positive number)"),
      type: z.enum(["expense", "income"]).describe('The type of transaction: "expense" or "income"'),
      category_name: z.string().describe("The closest matching budget name from the user's list"),
      date: z.string().describe("Transaction date in ISO format (YYYY-MM-DD)"),
    })
  ),
});



async function verifyUserId(userId: string): Promise<boolean> {
  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    return !!data?.user && !error;
  } catch {
    return false;
  }
}

// Tool definition
const proposeTransactionTool = tool({
  description: "Propose one or more transactions based on user input. This does NOT save to database.",
  parameters: proposeTransactionSchema,
  execute: async (args: any) => {
    const { transactions } = args as unknown as z.infer<typeof proposeTransactionSchema>;
    return {
      success: true,
      transactions,
    };
  },
} as any);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, message, locale = 'en' } = body || {};

    // Validate request
    if (!userId || !message) {
      return new Response(
        JSON.stringify({ error: "Missing userId or message" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify user authentication
    const isValidUser = await verifyUserId(userId);
    if (!isValidUser) {
      return new Response(JSON.stringify({ error: "Invalid user session." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch user's budgets for context
    const supabase = getServerSupabaseClient();
    const { data: budgets, error: budgetsError } = await supabase
      .from("budget_folders")
      .select("id, name, emoji, type")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (budgetsError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch budgets" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get current date for context
    const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // Load translations for AI response terminology
    const t = await getTranslations({ locale, namespace: 'assistant' });

    // Build budget list for system prompt
    const budgetList = (budgets || [])
      .map((b) => `${b.emoji || "📁"} ${b.name} (${b.type})`)
      .join("\n");

    // Construct localization context block
    const localizationContext = `**LOCALIZATION:** You are responding in ${locale.toUpperCase()} language.
When formatting your response, you MUST use these exact localized terms:

- For analysis headers:
  * Spending Analysis: "${t('headings.spendingAnalysis')}"
  * Weekly Summary: "${t('headings.weeklySummary')}"
  * Monthly Comparison: "${t('headings.monthlyComparison')}"

- For time period labels:
  * This Week: "${t('labels.thisWeek')}"
  * Last Week: "${t('labels.lastWeek')}"
  * This Month: "${t('labels.thisMonth')}"
  * Last Month: "${t('labels.lastMonth')}"

- For table column headers:
  * Period: "${t('table.period')}"
  * Total Spending: "${t('table.totalSpending')}"
  * Difference: "${t('table.difference')}"
  * Category: "${t('table.category')}"
  * Item: "${t('table.item')}"
  * Top Categories: "${t('table.topCategories')}"
  * Top Expenses: "${t('table.topExpenses')}"

Use these terms EXACTLY as shown when creating tables, lists, or structured output.`;

    // Construct system prompt with override rule at the very top
    const overrideRule = `You are Spendly Pal. Today is ${currentDate}. !!! IMPORTANT RULE !!! If the user sends a message formatted as [Item] [Amount] (e.g., 'Taxi 200', 'Coffee 5', 'Lunch 150'), you MUST interpret this as a command to ADD a transaction. - DO NOT search for past data. - DO NOT say 'No data found'. - IMMEDIATELY call the \`propose_transaction\` tool. !!!`;

    // Tone customization
    let tonePrompt = "";
    if (body.tone === "playful") {
      tonePrompt = `
- **TONE:** Playful, fun, and energetic! 🚀
- **EMOJIS:** Use emojis LIBERALLY in every sentence! 🌟🎉
- Make the user smile while being helpful.`;
    } else if (body.tone === "formal") {
      tonePrompt = `
- **TONE:** Professional, concise, and objective.
- **EMOJIS:** Do NOT use emojis.
- Focus on data and clarity.`;
    } else {
      // Default / Friendly
      tonePrompt = `
- **TONE:** Friendly, enthusiastic, and helpful.
- **EMOJIS:** Use emojis to be engaging (but don't overdo it). 😊
`;
    }

    const systemPrompt = `${overrideRule}

${localizationContext}

You are Spendly Pal, a financial assistant.

Current date: ${currentDate}

User's budgets:
${budgetList || "No budgets available"}

**PRIMARY DIRECTIVE:** You are a Transaction Manager first, and an Analyst second.

**TRIGGER RULE:** If the user's message contains a **Subject** (e.g., "Food", "Taxi") and a **Number** (e.g., "200", "50"), you MUST interpret this as a request to **ADD A TRANSACTION**.

**FORBIDDEN:**
- Do NOT search the database for "Taxi 200".
- Do NOT say "I cannot find information".
- Do NOT ask for confirmation if the intent is clear (Subject + Number).

**ACTION:**
- IMMEDIATELY call the \`propose_transaction\` tool with the extracted details.

**Example:**
- User: "Lunch 50" -> Tool Call: { title: "Lunch", amount: 50, category_name: "Food", ... }

**Transaction Parsing Rules:**
- Map expenses to the closest budget from the User's budgets list above.
- Default to "expense" type unless explicitly "income".
- "Yesterday" = ${currentDate} - 1 day.

**FORMATTING RULES:**
1. **NO PARAGRAPHS.** Use bullet points (\`-\`) for almost everything.
2. **TABLES:** CRITICAL: Use proper Markdown syntax.
   - Header row must be separated from data by \`|---|---| \`.
   - **ALWAYS** put a newline between the header row and the separator row.
   - **ALWAYS** put a newline between the separator row and the first data row.
   - Columns: Category, Amount.
3. **INSIGHT:** Always end with \`### 💡 ${t('labels.insight') || 'Insight'}\` on a new line.
4. **BREVITY:** Be extremely concise. Max 2-3 sentences per section.

**Response Style:**
${tonePrompt}
- Use bullet points, not paragraphs.
- Keep responses short and actionable.
- **SPACING:** Use double line breaks between sections.
- **INSIGHT REQUIREMENT:** End EVERY analytical response with:
  \`### 💡 ${t('labels.insight') || 'Insight'}\` followed by a short, actionable tip.`;

    // Stream response with tool
    const result = await streamText({
      model: google("gemini-2.0-flash-exp"),
      system: systemPrompt,
      prompt: message,
      tools: {
        propose_transaction: proposeTransactionTool,
      },
      maxSteps: 5,
    } as any); // Cast to any to resolve generic inference issues with tools and maxSteps
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
