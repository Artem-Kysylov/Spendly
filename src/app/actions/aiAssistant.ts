'use server'

// Imports 
import { getServerSupabaseClient } from '@/lib/serverSupabase'
import { prepareUserContext } from '@/lib/ai/context'
import { parseAddCommand, sanitizeTitle } from '@/lib/ai/commands'
import { isComplexRequest, selectModel } from '@/lib/ai/routing'
import { detectIntentFromMessage, detectPeriodFromMessage } from '@/lib/ai/intent'
import { getWeekRange, getLastWeekRange, filterByDateRange, sumExpenses, budgetTotals as calcBudgetTotals, topExpenses, getThisMonthRange, compareMonthTotals } from '@/lib/ai/stats'
import type { AIAction, AIResponse, AIRequest, Transaction } from '@/types/ai'
import { buildInstructions, buildWeeklySections, buildMonthlySections, buildPrompt } from '@/prompts/spendlyPal/promptBuilder'
import { PROMPT_VERSION } from '@/prompts/spendlyPal/promptVersion'
import { localizeEmptyWeekly } from '@/prompts/spendlyPal/canonicalPhrases'

// Исполнение транзакции (вставка expense)
export const executeTransaction = async (userId: string, payload: { title: string; amount: number; budget_folder_id: string | null }) => {
  const supabase = getServerSupabaseClient()

  const title = sanitizeTitle(payload.title)
  const amount = Number(payload.amount)
  if (!isFinite(amount) || amount <= 0) {
    return { ok: false, message: 'Amount must be greater than zero.' }
  }
  if (!payload.budget_folder_id) {
    return { ok: false, message: 'Selected budget was not found. Please choose an existing budget.' }
  }

  // Определяем тип транзакции по папке бюджета
  const { data: folder, error: folderErr } = await supabase
    .from('budget_folders')
    .select('id, type')
    .eq('id', payload.budget_folder_id)
    .limit(1)
    .single()

  if (folderErr || !folder) {
    return { ok: false, message: 'Budget folder not found. Please refresh and try again.' }
  }

  const txType: 'expense' | 'income' = folder.type === 'income' ? 'income' : 'expense'

  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      title,
      amount,
      type: txType,
      budget_folder_id: payload.budget_folder_id,
      created_at: new Date().toISOString(),
    })
    .select()

  if (error) {
    return { ok: false, message: 'Failed to add transaction. Please try again.' }
  }
  return { ok: true, message: 'Transaction added successfully!' }
}

export const composeLLMPrompt = (
  ctx: {
    budgets: Array<{ id: string; name: string; emoji?: string; type: 'expense' | 'income'; amount?: number }>;
    lastTransactions: Array<{ title: string; amount: number; type: 'expense' | 'income'; budget_folder_id: string | null; created_at: string }>;
    lastMonthTxs: any[];
  },
  userMessage: string,
  opts?: { locale?: string; currency?: string; promptVersion?: string; maxChars?: number }
): string => {
  // Thin wrapper: detect intent, compute aggregates via stats.ts, delegate formatting to promptBuilder
  const locale = opts?.locale || 'en-US'
  const currency = (opts?.currency || 'USD').toUpperCase()
  const intent = detectIntentFromMessage(userMessage)
  const builderIntent =
    intent === 'save_advice' ||
    intent === 'analyze_spending' ||
    intent === 'biggest_expenses' ||
    intent === 'compare_months'
      ? intent
      : 'unknown'

  const budgetNameById = new Map<string, string>()
  for (const b of (ctx.budgets || [])) {
    if (b.id) budgetNameById.set(b.id, b.name)
  }

  const now = new Date()
  const { start: weekStart } = getWeekRange(now)
  const { start: lastWeekStart, end: lastWeekEnd } = getLastWeekRange(weekStart)

  const txsThisWeek = filterByDateRange((ctx.lastTransactions || []) as Transaction[], weekStart, now)
  const txsLastWeek = filterByDateRange((ctx.lastTransactions || []) as Transaction[], lastWeekStart, lastWeekEnd)

  const thisWeekExpensesTotal = sumExpenses(txsThisWeek)
  const lastWeekExpensesTotal = sumExpenses(txsLastWeek)

  const budgetTotalsThisWeek = calcBudgetTotals(txsThisWeek, budgetNameById)
  const budgetTotalsLastWeek = calcBudgetTotals(txsLastWeek, budgetNameById)

  const top3ThisWeek = topExpenses(txsThisWeek, 3)
  const top3LastWeek = topExpenses(txsLastWeek, 3)

  const { start: thisMonthStart, end: thisMonthEnd } = getThisMonthRange(now)
  const txsThisMonth = filterByDateRange((ctx.lastTransactions || []) as Transaction[], thisMonthStart, thisMonthEnd)
  const lastMonthTxs = ((ctx.lastMonthTxs || []) as any[]) as Transaction[]

  const { totalThis: totalThisMonth, totalLast: totalLastMonth, diff } = compareMonthTotals(txsThisMonth, lastMonthTxs)

  const budgetTotalsThisMonth = calcBudgetTotals(txsThisMonth, budgetNameById)
  const budgetTotalsLastMonth = calcBudgetTotals(lastMonthTxs, budgetNameById)

  const top3ThisMonth = topExpenses(txsThisMonth, 3)
  const top3LastMonth = topExpenses(lastMonthTxs, 3)

  const instructions = buildInstructions({ locale, currency, promptVersion: opts?.promptVersion || PROMPT_VERSION, intent: builderIntent })

  const weeklySection = buildWeeklySections({
    weekStartISO: weekStart.toISOString().slice(0, 10),
    weekEndISO: now.toISOString().slice(0, 10),
    lastWeekStartISO: lastWeekStart.toISOString().slice(0, 10),
    lastWeekEndISO: lastWeekEnd.toISOString().slice(0, 10),
    thisWeekTotal: thisWeekExpensesTotal,
    lastWeekTotal: lastWeekExpensesTotal,
    budgetTotalsThisWeek,
    budgetTotalsLastWeek,
    txsThisWeek,
    txsLastWeek,
    topThisWeek: top3ThisWeek,
    topLastWeek: top3LastWeek,
    currency,
    budgetNameById
  })

  const monthlySection = buildMonthlySections({
    thisMonthStartISO: thisMonthStart.toISOString().slice(0, 10),
    thisMonthEndISO: thisMonthEnd.toISOString().slice(0, 10),
    lastMonthStartISO: new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() - 1, 1).toISOString().slice(0, 10),
    lastMonthEndISO: new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth(), 0).toISOString().slice(0, 10),
    totalThisMonth,
    totalLastMonth,
    diff,
    budgetTotalsThisMonth,
    budgetTotalsLastMonth,
    topThisMonth: top3ThisMonth,
    topLastMonth: top3LastMonth,
    currency,
    budgetNameById
  })

  return buildPrompt({
    budgets: ctx.budgets,
    instructions,
    weeklySection,
    monthlySection,
    userMessage,
    maxChars: opts?.maxChars
  })
}

// Канонический ответ без вызова LLM, если за период нет расходов
export const getCanonicalEmptyReply = (
  ctx: { budgets: Array<{ id: string; name: string; emoji?: string; type: 'expense' | 'income'; amount?: number }>; lastTransactions: Array<{ title: string; amount: number; type: 'expense' | 'income'; budget_folder_id: string | null; created_at: string }>; lastMonthTxs: any[] },
  userMessage: string,
  opts?: { locale?: string }
): { shouldBypass: boolean; message: string; period: 'thisWeek' | 'lastWeek' | 'unknown' } => {
  const rawPeriod = detectPeriodFromMessage(userMessage)
  const period: 'thisWeek' | 'lastWeek' | 'unknown' = (rawPeriod === 'thisWeek' || rawPeriod === 'lastWeek') ? rawPeriod : 'unknown'
  if (period === 'unknown') return { shouldBypass: false, message: '', period }

  const now = new Date()
  const { start: weekStart } = getWeekRange(now)
  const { start: lastWeekStart, end: lastWeekEnd } = getLastWeekRange(weekStart)

  const txsThisWeek = filterByDateRange((ctx.lastTransactions || []) as Transaction[], weekStart, now)
  const txsLastWeek = filterByDateRange((ctx.lastTransactions || []) as Transaction[], lastWeekStart, lastWeekEnd)

  const thisWeekExpensesTotal = sumExpenses(txsThisWeek)
  const lastWeekExpensesTotal = sumExpenses(txsLastWeek)

  const debug = (process.env.LLM_DEBUG === '1' || process.env.LLM_DEBUG === 'true')
  if (period === 'thisWeek' && thisWeekExpensesTotal <= 0) {
    if (debug) {
      console.debug('[LLM_DEBUG canonical]', JSON.stringify({ period, total: thisWeekExpensesTotal, reason: 'no-expenses' }))
    }
    return { shouldBypass: true, message: localizeEmptyWeekly('thisWeek', opts?.locale), period }
  }
  if (period === 'lastWeek' && lastWeekExpensesTotal <= 0) {
    if (debug) {
      console.debug('[LLM_DEBUG canonical]', JSON.stringify({ period, total: lastWeekExpensesTotal, reason: 'no-expenses' }))
    }
    return { shouldBypass: true, message: localizeEmptyWeekly('lastWeek', opts?.locale), period }
  }
  return { shouldBypass: false, message: '', period }
}

// Основной обработчик запроса ИИ (без стрима — стрим делаем в API)
export const aiResponse = async (req: AIRequest): Promise<AIResponse> => {
  const { userId, isPro = false, enableLimits = false, message, confirm = false, actionPayload } = req
  // Лимиты: перенесены в API-маршрут

  const ctx = await prepareUserContext(userId)

  const parsed = parseAddCommand(message, ctx.budgets as any)
  if (parsed && !confirm) {
    if (!parsed.budget_folder_id) {
      return { kind: 'message', message: `Budget "${parsed.budget_name}" was not found. Please create it or specify an existing budget.`, model: 'gemini-2.5-flash' }
    }
    const action: AIAction = {
      type: 'add_transaction',
      payload: parsed
    }
    const confirmText = `Confirm adding $${parsed.amount.toFixed(2)} "${parsed.title}" to ${parsed.budget_name}? Reply Yes/No.`
    return { kind: 'action', action, confirmText }
  }

  if (confirm && actionPayload) {
    const res = await executeTransaction(userId, actionPayload)
    const suffix = res.ok ? 'We updated your charts.' : 'Please try again.'
    return { kind: 'message', message: `${res.message} ${suffix}`, model: 'gemini-2.5-flash' }
  }

  const complex = isComplexRequest(message)
  const model = selectModel(isPro, complex)

  const summary = `Model: ${model}. Last 30 transactions loaded. Last month transactions: ${ctx.lastMonthTxs.length}. Ask me to add items using "add ... to ... budget".`

  return { kind: 'message', message: summary, model }
}