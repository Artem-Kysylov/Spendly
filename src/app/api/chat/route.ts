import { NextRequest } from 'next/server'
import { streamText, tool } from 'ai'
import { z } from 'zod'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { getServerSupabaseClient } from '@/lib/serverSupabase'

// Initialize Google AI provider
const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY,
})

// Zod schema for transaction proposal
const proposeTransactionSchema = z.object({
    transactions: z.array(
        z.object({
            title: z.string().describe('Short description of the transaction (e.g., "Gas Station", "Coffee")'),
            amount: z.number().positive().describe('Transaction amount (positive number)'),
            type: z.enum(['expense', 'income']).describe('Transaction type'),
            category_name: z.string().describe('Budget category name from the user\'s list'),
            date: z.string().describe('Transaction date in ISO format (YYYY-MM-DD)'),
        })
    ),
})

async function verifyUserId(userId: string): Promise<boolean> {
    try {
        const supabase = getServerSupabaseClient()
        const { data, error } = await supabase.auth.admin.getUserById(userId)
        return !!data?.user && !error
    } catch {
        return false
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { userId, message } = body || {}

        // Validate request
        if (!userId || !message) {
            return new Response(JSON.stringify({ error: 'Missing userId or message' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Verify user authentication
        const isValidUser = await verifyUserId(userId)
        if (!isValidUser) {
            return new Response(JSON.stringify({ error: 'Invalid user session.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Fetch user's budgets for context
        const supabase = getServerSupabaseClient()
        const { data: budgets, error: budgetsError } = await supabase
            .from('budget_folders')
            .select('id, name, emoji, type')
            .eq('user_id', userId)
            .order('name', { ascending: true })

        if (budgetsError) {
            return new Response(JSON.stringify({ error: 'Failed to fetch budgets' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Get current date for context
        const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        // Build budget list for system prompt
        const budgetList = (budgets || [])
            .map((b) => `${b.emoji || '📁'} ${b.name} (${b.type})`)
            .join('\n')

        // Construct system prompt
        const systemPrompt = `You are Spendly Pal, a financial assistant.

Current date: ${currentDate}

User's budgets:
${budgetList || 'No budgets available'}

Your task: Parse user messages about expenses or income and extract transaction details.

Rules:
- When the user mentions "yesterday", calculate the date as ${currentDate} minus 1 day
- Map expense/income mentions to the closest budget from the list above
- Use EXACT budget names from the user's list
- Default to "expense" type unless explicitly stated as income
- Return multiple transactions if multiple items are mentioned

Example:
User: "Yesterday gas 500"
→ Extract: title="Gas", amount=500, type="expense", category_name="Gas" (or closest match), date=yesterday's date`

        // Stream response with tool
        const result = await streamText({
            model: google('gemini-2.0-flash-exp'),
            system: systemPrompt,
            prompt: message,
            tools: {
                propose_transaction: tool({
                    description: 'Propose one or more transactions based on user input. This does NOT save to database.',
                    parameters: proposeTransactionSchema,
                    execute: async ({ transactions }) => {
                        // This execute function is called server-side during streaming
                        // We return the data which will be sent to the client
                        return {
                            success: true,
                            transactions,
                        }
                    },
                }),
            },
            maxSteps: 5, // Allow multiple tool calls
        })

        return result.toDataStreamResponse()
    } catch (error) {
        console.error('Error in /api/chat:', error)
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        })
    }
}
