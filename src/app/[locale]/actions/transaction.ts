'use server'

import { getServerSupabaseClient } from '@/lib/serverSupabase'
import { revalidatePath } from 'next/cache'

export interface SaveTransactionInput {
    user_id: string
    title: string
    amount: number
    type: 'expense' | 'income'
    budget_folder_id: string
    created_at: string // ISO date string
}

export interface SaveTransactionResult {
    success: boolean
    error?: string
    transactionId?: string
}

// Sanitize title to prevent XSS and trim whitespace
function sanitizeTitle(title: string): string {
    return String(title || '')
        .trim()
        .slice(0, 200) // Max length
        .replace(/[<>]/g, '') // Remove potential HTML tags
}

// Validate UUID format
function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
}

export async function saveProposedTransaction(
    input: SaveTransactionInput
): Promise<SaveTransactionResult> {
    try {
        const supabase = getServerSupabaseClient()

        // Validate user_id
        if (!input.user_id || !isValidUUID(input.user_id)) {
            return { success: false, error: 'Invalid user ID' }
        }

        // Validate budget_folder_id
        if (!input.budget_folder_id || !isValidUUID(input.budget_folder_id)) {
            return { success: false, error: 'Invalid budget folder ID' }
        }

        // Validate amount
        const amount = Number(input.amount)
        if (!Number.isFinite(amount) || amount <= 0) {
            return { success: false, error: 'Amount must be greater than zero' }
        }

        // Sanitize title
        const title = sanitizeTitle(input.title)
        if (!title) {
            return { success: false, error: 'Title cannot be empty' }
        }

        // Validate created_at date
        const createdAt = new Date(input.created_at)
        if (isNaN(createdAt.getTime())) {
            return { success: false, error: 'Invalid date format' }
        }

        // Verify budget folder exists and belongs to user
        const { data: budgetFolder, error: budgetError } = await supabase
            .from('budget_folders')
            .select('id, type, user_id')
            .eq('id', input.budget_folder_id)
            .eq('user_id', input.user_id)
            .single()

        if (budgetError || !budgetFolder) {
            return {
                success: false,
                error: 'Budget folder not found or access denied',
            }
        }

        // Ensure transaction type matches budget folder type
        const transactionType = budgetFolder.type === 'income' ? 'income' : 'expense'

        // Insert transaction
        const { data: transaction, error: insertError } = await supabase
            .from('transactions')
            .insert({
                user_id: input.user_id,
                title,
                amount,
                type: transactionType,
                budget_folder_id: input.budget_folder_id,
                created_at: createdAt.toISOString(),
            })
            .select('id')
            .single()

        if (insertError) {
            console.error('Transaction insert error:', insertError)
            return {
                success: false,
                error: 'Failed to save transaction. Please try again.',
            }
        }

        // Revalidate paths to update UI
        revalidatePath('/[locale]/dashboard')
        revalidatePath('/[locale]/transactions')
        revalidatePath('/[locale]/budgets')

        return {
            success: true,
            transactionId: transaction?.id,
        }
    } catch (error) {
        console.error('Save transaction error:', error)
        return {
            success: false,
            error: 'An unexpected error occurred',
        }
    }
}
