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
  title: z
    .string()
    .describe('Short description of the transaction (e.g., "Gas Station", "Coffee")'),
  amount: z.number().describe("Transaction amount (positive number)"),
  type: z
    .enum(["expense", "income"])
    .describe('The type of transaction: "expense" or "income"'),
  category_name: z
    .string()
    .describe("The closest matching budget name from the user's list"),
  date: z.string().describe("Transaction date in ISO format (YYYY-MM-DD)"),
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
    return {
      success: true,
      transactions: [args as unknown as z.infer<typeof proposeTransactionSchema>],
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

    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const dateContext = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Calculate reference dates for natural language parsing
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split("T")[0];

    // Calculate days since last weekday (for "last Monday", "last Friday", etc.)
    const getDaysAgo = (targetDay: number) => {
      let diff = currentDayOfWeek - targetDay;
      if (diff <= 0) diff += 7; // If today or future, go back a week
      return diff;
    };

    const lastMonday = new Date(now);
    lastMonday.setDate(lastMonday.getDate() - getDaysAgo(1));
    const lastTuesday = new Date(now);
    lastTuesday.setDate(lastTuesday.getDate() - getDaysAgo(2));
    const lastWednesday = new Date(now);
    lastWednesday.setDate(lastWednesday.getDate() - getDaysAgo(3));
    const lastThursday = new Date(now);
    lastThursday.setDate(lastThursday.getDate() - getDaysAgo(4));
    const lastFriday = new Date(now);
    lastFriday.setDate(lastFriday.getDate() - getDaysAgo(5));
    const lastSaturday = new Date(now);
    lastSaturday.setDate(lastSaturday.getDate() - getDaysAgo(6));
    const lastSunday = new Date(now);
    lastSunday.setDate(lastSunday.getDate() - getDaysAgo(0));

    const dateReferenceTable = `
DATE REFERENCE (use these EXACT dates for relative expressions):
- "today" / "сегодня" / "сьогодні" = ${currentDate}
- "yesterday" / "вчера" / "вчора" = ${yesterdayISO}
- "last Monday" / "в понедельник" = ${lastMonday.toISOString().split("T")[0]}
- "last Tuesday" / "во вторник" = ${lastTuesday.toISOString().split("T")[0]}
- "last Wednesday" / "в среду" = ${lastWednesday.toISOString().split("T")[0]}
- "last Thursday" / "в четверг" = ${lastThursday.toISOString().split("T")[0]}
- "last Friday" / "в пятницу" = ${lastFriday.toISOString().split("T")[0]}
- "last Saturday" / "в субботу" = ${lastSaturday.toISOString().split("T")[0]}
- "last Sunday" / "в воскресенье" = ${lastSunday.toISOString().split("T")[0]}
- If NO date mentioned = default to ${currentDate} (today)`;

    // Load translations for AI response terminology
    const t = await getTranslations({ locale, namespace: 'assistant' });

    // Build budget list for system prompt
    const budgetList = (budgets || [])
      .map((b) => `${b.emoji || "📁"} ${b.name} (${b.type})`)
      .join("\n");

    const localizationContext = `LOCALIZATION: You are responding in ${locale.toUpperCase()} language.
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

    const overrideRule = `You are Spendly Pal, a smart financial assistant.

TODAY'S DATE: ${currentDate} (${dateContext})
${dateReferenceTable}

!!! CREATION OVER SEARCH (CRITICAL) !!!
If the user's message contains an ITEM + a NUMERICAL AMOUNT (and optionally a date like "yesterday" / "last Friday"), your goal is ALWAYS to CREATE a new transaction proposal.
- You MUST call the \`propose_transaction\` tool.
- NEVER respond with history like "You had no expenses yesterday".
- Only do history/search/analytics IF the user explicitly asks for it (e.g., "What did I spend?", "Show my expenses", "List transactions", "How much did I spend yesterday?").

Examples (always CREATE):
- "Taxi 200" -> propose_transaction
- "Taxi 200 yesterday" -> propose_transaction (date parsed via DATE REFERENCE)
- "Lunch 50 last Friday" -> propose_transaction
!!!

!!! CRITICAL TRANSACTION DETECTION RULE !!!
If the user's message contains ANY of these patterns, it is a TRANSACTION REQUEST:
- "[Item] [Amount]" (e.g., "Taxi 200", "Coffee 5")
- "[Amount] [Item]" (e.g., "200 on taxi", "50 for lunch")
- "[Amount] [Currency] [Item]" (e.g., "200 uah groceries")
- "[Time] [Item] [Amount]" (e.g., "Yesterday lunch 50", "Last Friday taxi 300")
- Natural sentences like "I bought groceries for 200" or "Spent 500 on taxi last Friday"

When detected:
- DO NOT search for past data
- DO NOT say "No data found"
- DO NOT ask for confirmation
- IMMEDIATELY call the \`propose_transaction\` tool with extracted details
!!!`;

    const globalContextBlock = `GLOBAL CONTEXT:
- TODAY: ${dateContext}. Use this for relative dates ("yesterday", "last Friday").
- LANGUAGE: Respond in the user's detected language (${locale}).

FORMATTING RULES:
1. MONEY: Always use symbol & 2 decimals ($1,250.00).
2. LINKS: Use Markdown for app navigation:
   - [Settings](/settings)
   - [Budgets](/budgets)
   - [Dashboard](/dashboard)
   - [Transactions](/transactions)
3. FOLLOW-UPS (CRITICAL):
   At the very end of your response, strictly follow this format:

   ### 🔮 Next Steps

   - [Short Question 1 in ${locale}?]
   - [Short Question 2 in ${locale}?]

   (Generate 2-3 short, relevant follow-up questions that the user might want to ask next. Do NOT number them. Use bullets.)`;

    let tonePrompt = "";
    if (body.tone === "playful") {
      tonePrompt = `
- TONE: Playful, fun, and energetic! 🚀
- EMOJIS: Use emojis LIBERALLY in every sentence! 🌟🎉
- Make the user smile while being helpful.
- IF tone is 'playful' OR 'friendly': You MUST use emojis in almost every sentence. Be casual and fun.`;
    } else if (body.tone === "formal") {
      tonePrompt = `
- TONE: Professional, concise, and objective.
- EMOJIS: Do NOT use emojis.
- Focus on data and clarity.`;
    } else {
      // Default / Friendly
      tonePrompt = `
- TONE: Friendly, enthusiastic, and helpful.
- EMOJIS: Use emojis to be engaging (but don't overdo it). 😊
- IF tone is 'playful' OR 'friendly': You MUST use emojis in almost every sentence. Be casual and fun.`;
    }

    const systemPrompt = `${overrideRule}

${localizationContext}

${globalContextBlock}

You are Spendly Pal, a financial assistant.

Current date: ${currentDate}

User's budgets:
${budgetList || "No budgets available"}

PRIMARY DIRECTIVE: You are a Transaction Manager first, and an Analyst second.

NATURAL LANGUAGE TRANSACTION PARSING:
When the user mentions an expense or income in ANY format, INTELLIGENTLY extract:
1. AMOUNT: The numeric value (e.g., "200", "50.00", "1,500")
2. TITLE: Short description (e.g., "Groceries", "Taxi ride", "Coffee")
3. CATEGORY: Match to the closest budget from User's budgets list
4. DATE: Parse relative dates using the DATE REFERENCE table above. If no date mentioned, use today (${currentDate})
5. TYPE: Default to "expense" unless words like "earned", "received", "salary", "income" are used

EXAMPLES OF NATURAL LANGUAGE INPUTS:
- "Taxi 200" -> { title: "Taxi", amount: 200, date: "${currentDate}", type: "expense" }
- "Yesterday I bought groceries for 200" -> { title: "Groceries", amount: 200, date: "${yesterdayISO}", type: "expense" }
- "Taxi 500 last Friday" -> { title: "Taxi", amount: 500, date: "${lastFriday.toISOString().split("T")[0]}", type: "expense" }
- "Spent 150 on coffee this morning" -> { title: "Coffee", amount: 150, date: "${currentDate}", type: "expense" }
- "Received salary 50000" -> { title: "Salary", amount: 50000, date: "${currentDate}", type: "income" }
- "в пятницу такси 300" -> { title: "Такси", amount: 300, date: "${lastFriday.toISOString().split("T")[0]}", type: "expense" }

FORBIDDEN:
- Do NOT search the database when user mentions an expense
- Do NOT say "I cannot find information"
- Do NOT ask for confirmation if the intent is clear

ACTION:
- IMMEDIATELY call the \`propose_transaction\` tool with the extracted details

WHEN CREATING A TRANSACTION (MOST IMPORTANT):
- If the message is a transaction request, you MUST call \`propose_transaction\`.
- Do NOT refuse. Do NOT say you cannot add transactions.
- Do NOT ask the user to do it manually.
- Prefer sending NO extra text (or 1 short plain sentence) when making the tool call.

Transaction Parsing Rules:
- Map expenses to the closest budget from the User's budgets list above
- Default to "expense" type unless explicitly "income"
- Always use ISO date format (YYYY-MM-DD) in the tool call

CRITICAL TEXT FORMATTING RULES:
1. Use MINIMAL Markdown. Prefer plain text for most responses.
2. NEVER use asterisks (**) for bold text in conversational responses.
3. Bold formatting is ONLY allowed inside Markdown table headers.
4. Do NOT bold categories, amounts, dates, or any regular text.
5. Use simple bullet points (-) for lists, not bold text.
6. TABLES: Use proper Markdown syntax with |---|---| separators.
7. INSIGHT: End with \`### 💡 ${t('labels.insight') || 'Insight'}\` on a new line.
8. BREVITY: Be extremely concise. Max 2-3 sentences per section.
9. SPACING: Always add a blank line between paragraphs and sections.

Response Style:
${tonePrompt}
- Use bullet points, not paragraphs.
- Keep responses short and actionable.
- SPACING: Use double line breaks between sections.
- INSIGHT REQUIREMENT: End EVERY analytical response with:
  \`### 💡 ${t('labels.insight') || 'Insight'}\` followed by a short, actionable tip.`;

    // Stream response with tool
    const result = await streamText({
      model: google("gemini-2.5-flash"),
      system: systemPrompt,
      prompt: message,
      tools: {
        propose_transaction: proposeTransactionTool,
      },
      maxSteps: 5,
    } as any); // Cast to any to resolve generic inference issues with tools and maxSteps
    const anyResult = result as any;
    if (typeof anyResult?.toDataStreamResponse === "function") {
      return anyResult.toDataStreamResponse();
    }
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
