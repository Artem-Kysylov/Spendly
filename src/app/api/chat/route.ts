import { NextRequest } from "next/server";
import { streamText, tool, jsonSchema } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getServerSupabaseClient } from "@/lib/serverSupabase";

// Initialize Google AI provider
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

// JSON Schema for transaction proposal (с типами, чтобы инферился args в execute)
const proposeTransactionSchema = jsonSchema<{
  transactions: Array<{
    title: string;
    amount: number;
    type: "expense" | "income";
    category_name: string;
    date: string;
  }>;
}>({
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description:
              'Short description of the transaction (e.g., "Gas Station", "Coffee")',
          },
          amount: {
            type: "number",
            description: "Transaction amount (positive number)",
          },
          type: {
            type: "string",
            description: 'The type of transaction: "expense" or "income"',
          },
          category_name: {
            type: "string",
            description: "The closest matching budget name from the user's list",
          },
          date: {
            type: "string",
            description: "Transaction date in ISO format (YYYY-MM-DD)",
          },
        },
        required: ["title", "amount", "type", "category_name", "date"],
      },
    },
  },
  required: ["transactions"],
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, message } = body || {};

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

    // Build budget list for system prompt
    const budgetList = (budgets || [])
      .map((b) => `${b.emoji || "📁"} ${b.name} (${b.type})`)
      .join("\n");

    // Construct system prompt
    const systemPrompt = `You are Spendly Pal, a financial assistant.

Current date: ${currentDate}

User's budgets:
${budgetList || "No budgets available"}

**⚠️ CORE RULE - TRANSACTION CREATION:**
If the user input contains a generic description and a number (e.g., "Taxi 200", "Coffee 5", "Groceries 50"), you MUST interpret this as an intent to ADD a transaction.

**IMMEDIATELY CALL** the \`propose_transaction\` tool with the extracted details.

**DO NOT**:
- Search the database for these simple inputs
- Generate text responses asking for confirmation
- Ask clarifying questions for straightforward cases

**ONLY SEARCH** if the user explicitly asks analytical questions like:
- "How much did I spend on..."
- "Show me my transactions"
- "What's my budget for..."

**Response Style:**
- Be concise and direct
- Use bullet points for lists
- Do not repeat the user's request
- Avoid verbose explanations

**Transaction Parsing Rules:**
- When the user mentions "yesterday", calculate the date as ${currentDate} minus 1 day
- Map expense/income mentions to the closest budget from the list above
- Use EXACT budget names from the user's list
- Default to "expense" type unless explicitly stated as income
- Return multiple transactions if multiple items are mentioned
- For the "type" field, use exactly "expense" or "income" (lowercase)

Example:
User: "Yesterday gas 500"
→ Extract: title="Gas", amount=500, type="expense", category_name="Gas" (or closest match), date=yesterday's date

Example:
User: "Taxi 200"
→ IMMEDIATELY call propose_transaction with: title="Taxi", amount=200, type="expense", category_name="Transportation" (or closest match), date=${currentDate}`;

    // Stream response with tool
    const result = await streamText({
      model: google("gemini-2.0-flash-exp"),
      system: systemPrompt,
      prompt: message,
      tools: {
        propose_transaction: tool({
          description:
            "Propose one or more transactions based on user input. This does NOT save to database.",
          inputSchema: proposeTransactionSchema,
          execute: async ({ transactions }) => {
            return {
              success: true,
              transactions,
            };
          },
        }),
      },
    });
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
