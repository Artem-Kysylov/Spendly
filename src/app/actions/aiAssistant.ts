'use server'

import { getServerSupabaseClient } from '@/lib/serverSupabase'
import { normalizeBudgetName } from '@/lib/utils'
import { getPreviousMonthRange } from '@/lib/dateUtils'

// Типы
export type AIAction =
  | { type: 'add_transaction'; payload: { title: string; amount: number; budget_folder_id: string | null; budget_name: string } }

export type AIResponse =
  | { kind: 'action'; action: AIAction; confirmText: string }
  | { kind: 'message'; message: string; model: 'gemini-1.5-flash' | 'gpt-4o-mini' }

export interface AIRequest {
  userId: string
  isPro?: boolean
  enableLimits?: boolean
  message: string
  confirm?: boolean
  actionPayload?: AIAction['payload']
}

// Эвристика сложности
export const isComplexRequest = (text: string): boolean => {
  const lower = text.toLowerCase()
  const hasKeywords = /(save|analyze|forecast)/.test(lower)
  const isLong = text.length > 100
  return hasKeywords || isLong
}

// Маршрутизация моделей
export const selectModel = (isPro?: boolean, isComplex?: boolean): 'gemini-1.5-flash' | 'gpt-4o-mini' => {
  if (isPro && isComplex) return 'gpt-4o-mini'
  return 'gemini-1.5-flash'
}

// Подготовка данных пользователя (MVP: последние 30 транзакций и бюджеты)
export const prepareUserContext = async (userId: string) => {
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
    .limit(30)

  const { start, end } = getPreviousMonthRange()
  const lastMonthTxs = (lastTransactions || []).filter(tx => {
    const d = new Date(tx.created_at)
    return d >= start && d <= end
  })

  return {
    budgets: budgets || [],
    lastTransactions: lastTransactions || [],
    lastMonthTxs,
  }
}

// Парсинг команды “add … to … budget” (MVP для английского)
// Модуль: aiAssistant.ts

export const parseAddCommand = (text: string, budgets: Array<{ id: string; name: string; type: 'expense' | 'income' }>) => {
  const lower = text.toLowerCase()

  // Поддержка валютных символов и запятой как десятичного разделителя
  const regex = /add\s+(?:(?:([a-z0-9\s-]+)\s+))?(?:[$€₽]?\s*)?(\d+(?:[.,]\d+)?)\s+(?:to|into)\s+([a-z0-9\s-]+)\s+budget/i
  const match = lower.match(regex)
  if (!match) return null

  const rawTitle = (match[1] ? match[1].trim() : 'Transaction')
  const amount = Number((match[2] || '0').replace(',', '.'))
  const rawBudgetName = (match[3] || '').trim()

  if (!isFinite(amount) || amount <= 0) return null

  const normalized = normalizeBudgetName(rawBudgetName)
  const found = budgets.find(b => normalizeBudgetName(b.name) === normalized)

  const budget_folder_id = found ? found.id : null
  const budget_name = found ? found.name : rawBudgetName

  const safeTitle = sanitizeTitle(rawTitle)

  return {
    title: safeTitle,
    amount,
    budget_folder_id,
    budget_name
  }
}

function sanitizeTitle(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, ' ')
  const cleaned = trimmed.replace(/[^a-z0-9\s\-.,()#]/gi, '')
  const MAX_LEN = 60
  return cleaned.length > MAX_LEN ? cleaned.slice(0, MAX_LEN) : cleaned
}

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

export const composeLLMPrompt = (ctx: { budgets: Array<{ id: string; name: string; emoji?: string; type: 'expense' | 'income'; amount?: number }>; lastTransactions: Array<{ title: string; amount: number; type: 'expense' | 'income'; budget_folder_id: string | null; created_at: string }>; lastMonthTxs: any[] }, userMessage: string): string => {
  const budgetsSummary = (ctx.budgets || [])
    .map(b => `${b.name} (${b.type})`)
    .slice(0, 15)
    .join(', ')

  //  Budget ID
  const budgetNameById = new Map<string, string>()
  for (const b of (ctx.budgets || [])) {
    if (b.id) budgetNameById.set(b.id, b.name)
  }

  // Start of new week 
  const now = new Date()
  const day = now.getDay() === 0 ? 7 : now.getDay() // 1..7 (Пн..Вс)
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - (day - 1))
  weekStart.setHours(0, 0, 0, 0)

  // Транзакции за текущую неделю
  const txs = (ctx.lastTransactions || []).filter(tx => {
    const d = new Date(tx.created_at)
    return d >= weekStart && d <= now
  })

  const thisWeekExpensesTotal = txs
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)

  // Форматированный список (ограничим до 50 для компактности)
  const txLines = txs.slice(0, 50).map(tx => {
    const d = new Date(tx.created_at)
    const dateStr = d.toISOString().slice(0, 10)
    const budgetName = tx.budget_folder_id ? (budgetNameById.get(tx.budget_folder_id) || 'Unknown') : 'Unassigned'
    const amt = Number(tx.amount) || 0
    return `${dateStr} | ${tx.type} | $${amt.toFixed(2)} | budget: ${budgetName} | title: ${tx.title}`
  }).join('\n')

  // Добавляем прошлую неделю
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(weekStart.getDate() - 7)
  lastWeekStart.setHours(0, 0, 0, 0)
  const lastWeekEnd = new Date(weekStart)
  lastWeekEnd.setDate(weekStart.getDate() - 1)
  lastWeekEnd.setHours(23, 59, 59, 999)

  const txsLastWeek = (ctx.lastTransactions || []).filter(tx => {
    const d = new Date(tx.created_at)
    return d >= lastWeekStart && d <= lastWeekEnd
  })
  const lastWeekExpensesTotal = txsLastWeek
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)

  const txLastWeekLines = txsLastWeek.slice(0, 50).map(tx => {
    const d = new Date(tx.created_at)
    const dateStr = d.toISOString().slice(0, 10)
    const budgetName = tx.budget_folder_id ? (budgetNameById.get(tx.budget_folder_id) || 'Unknown') : 'Unassigned'
    const amt = Number(tx.amount) || 0
    return `${dateStr} | ${tx.type} | $${amt.toFixed(2)} | budget: ${budgetName} | title: ${tx.title}`
  }).join('\n')

  // Итоги по бюджетам за неделю (только расходы)
  const budgetTotals = new Map<string, number>()
  for (const tx of txs) {
    if (tx.type !== 'expense') continue
    const budgetName = tx.budget_folder_id ? (budgetNameById.get(tx.budget_folder_id) || 'Unknown') : 'Unassigned'
    budgetTotals.set(budgetName, (budgetTotals.get(budgetName) || 0) + (Number(tx.amount) || 0))
  }
  const budgetTotalsLines = Array.from(budgetTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, total]) => `${name}: $${total.toFixed(2)}`)
    .join('\n')

  // Итоги по бюджетам за прошлую неделю
  const budgetTotalsLastWeek = new Map<string, number>()
  for (const tx of txsLastWeek) {
    if (tx.type !== 'expense') continue
    const budgetName = tx.budget_folder_id ? (budgetNameById.get(tx.budget_folder_id) || 'Unknown') : 'Unassigned'
    budgetTotalsLastWeek.set(budgetName, (budgetTotalsLastWeek.get(budgetName) || 0) + (Number(tx.amount) || 0))
  }
  const budgetTotalsLastWeekLines = Array.from(budgetTotalsLastWeek.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, total]) => `${name}: $${total.toFixed(2)}`)
    .join('\n')

  // Топ-3 расходов недели
  const top3Lines = txs
    .filter(tx => tx.type === 'expense')
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 3)
    .map(tx => {
      const d = new Date(tx.created_at).toISOString().slice(0, 10)
      const budgetName = tx.budget_folder_id ? (budgetNameById.get(tx.budget_folder_id) || 'Unknown') : 'Unassigned'
      return `${d} | $${Number(tx.amount).toFixed(2)} | ${budgetName} | ${tx.title}`
    })
    .join('\n')

  // Топ-3 прошлой недели
  const top3LastWeekLines = txsLastWeek
    .filter(tx => tx.type === 'expense')
    .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    .slice(0, 3)
    .map(tx => {
      const d = new Date(tx.created_at).toISOString().slice(0, 10)
      const budgetName = tx.budget_folder_id ? (budgetNameById.get(tx.budget_folder_id) || 'Unknown') : 'Unassigned'
      return `${d} | $${Number(tx.amount).toFixed(2)} | ${budgetName} | ${tx.title}`
    })
    .join('\n')

  const instructions = [
    'You are a helpful finance assistant.',
    'Respond directly and concisely in the user’s language. Do not include greetings or introductions.',
    'Use only the data provided below (TransactionsThisWeek, TransactionsLastWeek, Known budgets). Do not invent transactions, merchants, categories, or amounts.',
    'Answer in plain text only. Do not use JSON, code fences, or markdown tables.',
    'If the user asks to show expenses for this week, use the ThisWeek data.',
    'If the user asks to show expenses for last week, use the LastWeek data.',
    'If the requested period has "none", reply exactly: "No expenses recorded this week." or "No expenses recorded last week."',
    'Output strictly in this format for the requested period:',
    '1) Total<Period>: $<number>',
    '2) BudgetTotals<Period>: <budget: amount> per line',
    '3) TopExpenses<Period>: <date | amount | budget | title> up to 3 lines',
    'Do not provide application instructions, onboarding, UI steps, or how-to guides unless explicitly asked.'
  ].join(' ')

  return [
    instructions,
    `Known budgets: ${budgetsSummary || 'none'}.`,
    `ThisWeekStart: ${weekStart.toISOString().slice(0,10)}; ThisWeekEnd: ${now.toISOString().slice(0,10)}.`,
    `TotalThisWeek: $${thisWeekExpensesTotal.toFixed(2)}.`,
    `BudgetTotalsThisWeek:\n${budgetTotalsLines || 'none'}`,
    `TransactionsThisWeek:\n${txLines || 'none'}`,
    `TopExpensesThisWeek:\n${top3Lines || 'none'}`,
    `LastWeekStart: ${lastWeekStart.toISOString().slice(0,10)}; LastWeekEnd: ${lastWeekEnd.toISOString().slice(0,10)}.`,
    `TotalLastWeek: $${lastWeekExpensesTotal.toFixed(2)}.`,
    `BudgetTotalsLastWeek:\n${budgetTotalsLastWeekLines || 'none'}`,
    `TransactionsLastWeek:\n${txLastWeekLines || 'none'}`,
    `TopExpensesLastWeek:\n${top3LastWeekLines || 'none'}`,
    `User: ${userMessage}`
  ].join('\n')
}

// Основной обработчик запроса ИИ (без стрима — стрим делаем в API)
export const aiResponse = async (req: AIRequest): Promise<AIResponse> => {
  const { userId, isPro = false, enableLimits = false, message, confirm = false, actionPayload } = req
  // Лимиты: перенесены в API-маршрут

  const ctx = await prepareUserContext(userId)

  const parsed = parseAddCommand(message, ctx.budgets as any)
  if (parsed && !confirm) {
    if (!parsed.budget_folder_id) {
      return { kind: 'message', message: `Budget "${parsed.budget_name}" was not found. Please create it or specify an existing budget.`, model: 'gemini-1.5-flash' }
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
    return { kind: 'message', message: `${res.message} ${suffix}`, model: 'gemini-1.5-flash' }
  }

  const complex = isComplexRequest(message)
  const model = selectModel(isPro, complex)

  const summary = `Model: ${model}. Last 30 transactions loaded. Last month transactions: ${ctx.lastMonthTxs.length}. Ask me to add items using "add ... to ... budget".`

  return { kind: 'message', message: summary, model }
}