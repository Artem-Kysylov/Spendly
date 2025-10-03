'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { UserAuth } from '../context/AuthContext'
import { 
  LineChartData, 
  BarChartData, 
  ChartFilters, 
  UseChartDataReturn,
  ComparisonLineChartData,
  UseComparisonChartDataReturn
} from '@/types/types'
import { 
  generateMockLineData, 
  generateMockBarData,
  calculatePreviousPeriod,
  groupTransactionsByDay,
  generateDateRange,
  getAmountByDataType,
  calculatePercentageChange,
  defaultChartColors
} from '@/lib/chartUtils'

import {
  useOptimizedLineChartData,
  useOptimizedBarChartData,
  useOptimizedAllChartsData
} from './useOptimizedChartData'

// Флаг для использования оптимизированных хуков
const USE_OPTIMIZED_HOOKS = process.env.NODE_ENV === 'production' || 
  process.env.NEXT_PUBLIC_USE_OPTIMIZED_CHARTS === 'true'

// Хук для данных Line Chart
export const useLineChartData = (filters: ChartFilters): UseChartDataReturn<LineChartData> => {
  // Используем оптимизированную версию если включена
  if (USE_OPTIMIZED_HOOKS) {
    return useOptimizedLineChartData(filters)
  }

  // Оригинальная реализация
  const { session } = UserAuth()
  const [data, setData] = useState<LineChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setIsLoading(true)
      setError(null)
      
      // Построение запроса с фильтрами
      let query = supabase
        .from('transactions')
        .select('amount, type, created_at')
        .eq('user_id', session.user.id)
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString())
        .order('created_at', { ascending: true })

      // Фильтр по типу данных (маппинг в enum БД)
      const dbType = filters.dataType === 'Expenses' ? 'expense' : 'income'
      query = query.eq('type', dbType)

      const { data: transactions, error } = await query
      if (error) {
        throw new Error(error.message)
      }

      // Группировка данных по дням
      const dailyTotals = transactions?.reduce((acc, transaction) => {
        const date = new Date(transaction.created_at).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { expenses: 0, income: 0 }
        }
        
        if (transaction.type === 'expense') {
          acc[date].expenses += transaction.amount
        } else {
          acc[date].income += transaction.amount
        }
        
        return acc
      }, {} as Record<string, { expenses: number; income: number }>) || {}

      const lineData: LineChartData[] = Object.entries(dailyTotals).map(([date, totals]) => {
        const amount = filters.dataType === 'Expenses' ? totals.expenses : totals.income
        return { date, amount }
      })
      
      setData(lineData)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch line chart data')
      // Fallback to mock data in case of error
      const mockData = generateMockLineData()
      setData(mockData)
    } finally {
      setIsLoading(false)
    }
  }, [filters, session?.user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handler = () => fetchData()
    window.addEventListener('budgetTransactionAdded', handler)
    return () => window.removeEventListener('budgetTransactionAdded', handler)
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  }
}

// Хук для данных Bar Chart
export const useBarChartData = (filters: ChartFilters): UseChartDataReturn<BarChartData> => {
  // Используем оптимизированную версию если включена
  if (USE_OPTIMIZED_HOOKS) {
    return useOptimizedBarChartData(filters)
  }

  // Оригинальная реализация
  const { session } = UserAuth()
  const [data, setData] = useState<BarChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Построение запроса с фильтрами
      let query = supabase
        .from('transactions')
        .select(`
          amount,
          type,
          budget_folders(id, name, emoji)
        `)
        .eq('user_id', session.user.id)
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString())

      // Фильтр по типу данных (маппинг в enum БД)
      const dbType = filters.dataType === 'Expenses' ? 'expense' : 'income'
      query = query.eq('type', dbType)

      const { data: transactions, error } = await query
      if (error) {
        throw new Error(error.message)
      }

      // Группировка данных по категориям (устойчиво к объекту/массиву budget_folders)
      const categoryTotals = (transactions ?? []).reduce((acc: Record<string, { expenses: number; income: number; emoji?: string }>, transaction: any) => {
        const folder = Array.isArray(transaction.budget_folders)
          ? transaction.budget_folders[0]
          : transaction.budget_folders

        const emoji = folder?.emoji ?? ''
        const name = folder?.name ?? 'Unbudgeted'
        const categoryName = `${emoji} ${name}`.trim()

        if (!acc[categoryName]) {
          acc[categoryName] = { expenses: 0, income: 0, emoji }
        }

        if (transaction.type === 'expense') {
          acc[categoryName].expenses += transaction.amount ?? 0
        } else {
          acc[categoryName].income += transaction.amount ?? 0
        }

        return acc
      }, {})

      // Преобразование в формат для BarChart
      const colors = Object.values(defaultChartColors)
      const barData: BarChartData[] = Object.entries(categoryTotals)
        .map(([category, totals], index) => {
          const amount = filters.dataType === 'Expenses' ? totals.expenses : totals.income
          return {
            category,
            amount,
            fill: colors[index % colors.length],
            emoji: totals.emoji
          }
        })
        .filter(item => item.amount > 0)
      
      setData(barData)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bar chart data')
      // Fallback to mock data in case of error
      const mockData = generateMockBarData()
      setData(mockData)
    } finally {
      setIsLoading(false)
    }
  }, [filters, session?.user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handler = () => fetchData()
    window.addEventListener('budgetTransactionAdded', handler)
    return () => window.removeEventListener('budgetTransactionAdded', handler)
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  }
}

// Комбинированный хук для всех графиков (Line + Bar)
export const useAllChartsData = (filters: ChartFilters) => {
  // Используем оптимизированную версию если включена
  if (USE_OPTIMIZED_HOOKS) {
    return useOptimizedAllChartsData(filters)
  }

  // Оригинальная реализация
  const lineChart = useLineChartData(filters)
  const barChart = useBarChartData(filters)

  return {
    lineChart,
    barChart,
    isLoading: lineChart.isLoading || barChart.isLoading,
    error: lineChart.error || barChart.error,
    refetchAll: () => {
      lineChart.refetch()
      barChart.refetch()
    }
  }
}

// Хук для данных сравнительного Line Chart (текущий период vs предыдущий)
export const useComparisonLineChartData = (filters: ChartFilters): UseComparisonChartDataReturn => {
  const { session } = UserAuth()
  const [data, setData] = useState<ComparisonLineChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPeriodTotal, setCurrentPeriodTotal] = useState<number>(0)
  const [previousPeriodTotal, setPreviousPeriodTotal] = useState<number>(0)
  const [percentageChange, setPercentageChange] = useState<number>(0)

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      // Используем утилиту для вычисления предыдущего периода
      const currentStart = filters.startDate
      const currentEnd = filters.endDate
      const { previousStart, previousEnd } = calculatePreviousPeriod(currentStart, currentEnd)

      // Запрос для текущего периода
      let currentQuery = supabase
        .from('transactions')
        .select('amount, type, created_at')
        .eq('user_id', session.user.id)
        .gte('created_at', currentStart.toISOString())
        .lte('created_at', currentEnd.toISOString())
        .order('created_at', { ascending: true })

      // Запрос для предыдущего периода
      let previousQuery = supabase
        .from('transactions')
        .select('amount, type, created_at')
        .eq('user_id', session.user.id)
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString())
        .order('created_at', { ascending: true })

      // Применяем фильтр по типу данных к обоим запросам
      const dbType = filters.dataType === 'Expenses' ? 'expense' : 'income'
      currentQuery = currentQuery.eq('type', dbType)
      previousQuery = previousQuery.eq('type', dbType)

      // Выполняем оба запроса параллельно
      const [currentResult, previousResult] = await Promise.all([
        currentQuery,
        previousQuery
      ])

      if (currentResult.error) throw new Error(currentResult.error.message)
      if (previousResult.error) throw new Error(previousResult.error.message)

      // Используем утилиту для группировки данных по дням
      const currentDailyTotals = groupTransactionsByDay(currentResult.data || [])
      const previousDailyTotals = groupTransactionsByDay(previousResult.data || [])

      // Используем утилиту для создания диапазона дат
      const dateRange = generateDateRange(currentStart, currentEnd)

      // Создаем данные для графика
      const comparisonData: ComparisonLineChartData[] = dateRange.map(date => {
        const dateStr = date.toISOString().split('T')[0]
        const currentAmount = getAmountByDataType(currentDailyTotals[dateStr], filters.dataType.toLowerCase() as 'expenses' | 'income')
        const previousAmount = getAmountByDataType(previousDailyTotals[dateStr], filters.dataType.toLowerCase() as 'expenses' | 'income')

        return {
          date: dateStr,
          formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          currentPeriod: currentAmount,
          previousPeriod: previousAmount
        }
      })

      // Вычисляем общие суммы и процентное изменение
      const currentTotal = Object.values(currentDailyTotals).reduce((sum, day) => 
        sum + getAmountByDataType(day, filters.dataType.toLowerCase() as 'expenses' | 'income'), 0)
      const previousTotal = Object.values(previousDailyTotals).reduce((sum, day) => 
        sum + getAmountByDataType(day, filters.dataType.toLowerCase() as 'expenses' | 'income'), 0)
      const change = calculatePercentageChange(previousTotal, currentTotal)

      setData(comparisonData)
      setCurrentPeriodTotal(currentTotal)
      setPreviousPeriodTotal(previousTotal)
      setPercentageChange(change)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comparison chart data')
      setData([])
    } finally {
      setIsLoading(false)
    }
  }, [filters, session?.user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    currentPeriodTotal,
    previousPeriodTotal,
    percentageChange
  }
}