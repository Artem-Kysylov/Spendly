import { detectIntentFromMessage } from '@/lib/ai/intent'
import { getWeekRange, getLastWeekRange, filterByDateRange, sumExpenses, budgetTotals as calcBudgetTotals, topExpenses, getThisMonthRange, compareMonthTotals } from '@/lib/ai/stats'
import type { Transaction } from '@/types/ai'
import { buildInstructions, buildWeeklySections, buildMonthlySections, buildPrompt } from './promptBuilder'
import { PROMPT_VERSION } from './promptVersion'

export const composeLLMPrompt = (
  ctx: {
    budgets: Array<{ id: string; name: string; emoji?: string; type: 'expense' | 'income'; amount?: number }>;
    lastTransactions: Array<{ title: string; amount: number; type: 'expense' | 'income'; budget_folder_id: string | null; created_at: string }>;
    lastMonthTxs: any[];
  },
  userMessage: string,
  opts?: { locale?: string; currency?: string; promptVersion?: string; maxChars?: number }
): string => {
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