import { supabase } from './supabaseClient'
import { ChartFilters, ChartPeriod } from '@/types/types'

// Типы для оптимизированных запросов
export interface TransactionData {
  id: string
  amount: number
  type: 'expense' | 'income'
  created_at: string
  budget_folder_id: string | null
  budget_folders?: {
    id: string
    name: string
    emoji: string
  } | {
    id: string
    name: string
    emoji: string
  }[] 
}

export interface AggregatedData {
  period: string
  expenses: number
  income: number
  total: number
}

export interface CategoryData {
  category: string
  emoji: string
  expenses: number
  income: number
  total: number
}

// Ключи для кэширования React Query
export const chartQueryKeys = {
  all: ['charts'] as const,
  transactions: (filters: ChartFilters) => [...chartQueryKeys.all, 'transactions', filters] as const,
  aggregated: (filters: ChartFilters, period: ChartPeriod) => [...chartQueryKeys.all, 'aggregated', filters, period] as const,
  categories: (filters: ChartFilters) => [...chartQueryKeys.all, 'categories', filters] as const,
}

// Оптимизированный запрос транзакций с фильтрами
export const fetchTransactions = async (
  userId: string,
  filters: ChartFilters
): Promise<TransactionData[]> => {
  let query = supabase
    .from('transactions')
    .select(`
      id,
      amount,
      type,
      created_at,
      budget_folder_id,
      budget_folders!inner(id, name, emoji)
    `)
    .eq('user_id', userId)
    .gte('created_at', filters.startDate.toISOString())
    .lte('created_at', filters.endDate.toISOString())
    .order('created_at', { ascending: true })

  // Применение фильтров
  if (filters.dataType !== 'both') {
    query = query.eq('type', filters.dataType)
  }

  if (filters.categories.length > 0) {
    query = query.in('budget_folder_id', filters.categories)
  }

  if (filters.budgetId) {
    query = query.eq('budget_folder_id', filters.budgetId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return (data ?? []) as TransactionData[]
}

// Агрегация данных по периодам
export const aggregateDataByPeriod = (
  transactions: TransactionData[],
  period: ChartPeriod
): AggregatedData[] => {
  const aggregated: Record<string, { expenses: number; income: number }> = {}

  transactions.forEach(transaction => {
    let periodKey: string

    const date = new Date(transaction.created_at)

    switch (period) {
      case 'week':
        // Группировка по неделям (понедельник как начало недели)
        const weekStart = new Date(date)
        const day = weekStart.getDay()
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
        weekStart.setDate(diff)
        periodKey = weekStart.toISOString().split('T')[0]
        break

      case 'month':
        // Группировка по месяцам
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        break

      case 'quarter':
        // Группировка по кварталам
        const quarter = Math.floor(date.getMonth() / 3) + 1
        periodKey = `${date.getFullYear()}-Q${quarter}`
        break

      case 'year':
        // Группировка по годам
        periodKey = date.getFullYear().toString()
        break

      default:
        // По дням (по умолчанию)
        periodKey = date.toISOString().split('T')[0]
    }

    if (!aggregated[periodKey]) {
      aggregated[periodKey] = { expenses: 0, income: 0 }
    }

    if (transaction.type === 'expense') {
      aggregated[periodKey].expenses += transaction.amount
    } else {
      aggregated[periodKey].income += transaction.amount
    }
  })

  return Object.entries(aggregated)
    .map(([period, totals]) => ({
      period,
      expenses: totals.expenses,
      income: totals.income,
      total: totals.expenses + totals.income
    }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

// Агрегация данных по категориям
export const aggregateDataByCategory = (
  transactions: TransactionData[]
): CategoryData[] => {
  const aggregated: Record<string, { emoji: string; expenses: number; income: number }> = {}

  transactions.forEach(transaction => {
    const folder = Array.isArray(transaction.budget_folders)
      ? transaction.budget_folders[0]
      : transaction.budget_folders

    const emoji = folder?.emoji ?? ''
    const name = folder?.name ?? 'Unknown'
    const categoryName = `${emoji} ${name}`.trim()

    if (!aggregated[categoryName]) {
      aggregated[categoryName] = { emoji, expenses: 0, income: 0 }
    }

    if (transaction.type === 'expense') {
      aggregated[categoryName].expenses += transaction.amount
    } else {
      aggregated[categoryName].income += transaction.amount
    }
  })

  return Object.entries(aggregated)
    .map(([category, data]) => ({
      category,
      emoji: data.emoji,
      expenses: data.expenses,
      income: data.income,
      total: data.expenses + data.income
    }))
    .sort((a, b) => b.total - a.total) // Сортировка по убыванию общей суммы
}

// Функция для получения статистики по периоду
export const fetchPeriodStats = async (
  userId: string,
  filters: ChartFilters
): Promise<{
  totalExpenses: number
  totalIncome: number
  transactionCount: number
  categoriesCount: number
}> => {
  const transactions = await fetchTransactions(userId, filters)
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const uniqueCategories = new Set(
    transactions.map(t => {
      const folder = Array.isArray(t.budget_folders) ? t.budget_folders[0] : t.budget_folders
      return folder?.id
    }).filter(Boolean)
  )

  return {
    totalExpenses,
    totalIncome,
    transactionCount: transactions.length,
    categoriesCount: uniqueCategories.size
  }
}

// Функция для предварительной загрузки данных
export const prefetchChartData = async (
  userId: string,
  filters: ChartFilters
): Promise<void> => {
  // Предварительная загрузка основных данных
  await Promise.all([
    fetchTransactions(userId, filters),
    fetchPeriodStats(userId, filters)
  ])
}