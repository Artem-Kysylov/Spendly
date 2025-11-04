// Серверный модуль: сборка контекста пользователя для AI
// ВАЖНО: не импортируйте этот модуль из клиентских хуков.

import { getServerSupabaseClient } from '@/lib/serverSupabase'
import { getPreviousMonthRange } from '@/lib/dateUtils'
import type { UserContext, BudgetFolder, Transaction } from '@/types/ai'
import { findRecurringCandidates } from './recurring'

export const prepareUserContext = async (userId: string): Promise<UserContext> => {
  const supabase = getServerSupabaseClient()

  const { data: budgets } = await supabase
    .from('budget_folders')
    .select('id, name, emoji, type, amount')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  const { data: lastTransactions } = await supabase
    .from('transactions')
    .select('id, title, amount, type, budget_folder_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)

  const { start, end } = getPreviousMonthRange()
  const lastMonthTxs = (lastTransactions || []).filter((tx: Transaction) => {
    const d = new Date(tx.created_at)
    return d >= start && d <= end
  })

  // Фича‑флаг: включение памяти повторяющихся
  const useRecurring = (process.env.USE_RECURRING_MEMORY === '1' || process.env.USE_RECURRING_MEMORY === 'true')
  const recurringCandidates = useRecurring ? findRecurringCandidates((lastTransactions || []) as Transaction[], 120) : []

  return {
    budgets: (budgets || []) as BudgetFolder[],
    lastTransactions: (lastTransactions || []) as Transaction[],
    lastMonthTxs: lastMonthTxs as Transaction[],
    recurringCandidates
  }
}