'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { UserAuth } from '../context/AuthContext'
import { 
  PieChartData, 
  LineChartData, 
  BarChartData, 
  ChartFilters, 
  UseChartDataReturn 
} from '@/types/types'
import { 
  generateMockPieData, 
  generateMockLineData, 
  generateMockBarData,
  calculatePieChartPercentages,
  generatePieColors,
  defaultChartColors
} from '@/lib/chartUtils'

// Импорт оптимизированных хуков
import {
  useOptimizedPieChartData,
  useOptimizedLineChartData,
  useOptimizedBarChartData,
  useOptimizedAllChartsData
} from './useOptimizedChartData'

// Флаг для переключения между обычными и оптимизированными хуками
const USE_OPTIMIZED_HOOKS = process.env.NODE_ENV === 'production' || 
  process.env.NEXT_PUBLIC_USE_OPTIMIZED_CHARTS === 'true'

// Hook for Pie Chart data
export const usePieChartData = (filters: ChartFilters): UseChartDataReturn<PieChartData> => {
  // Используем оптимизированную версию если включена
  if (USE_OPTIMIZED_HOOKS) {
    return useOptimizedPieChartData(filters)
  }

  // Оригинальная реализация (без изменений)
  const { session } = UserAuth()
  const [data, setData] = useState<PieChartData[]>([])
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
        .select(`
          amount,
          type,
          budget_folders!inner(id, name, emoji)
        `)
        .eq('user_id', session.user.id)
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString())

      // Фильтр по типу данных
      if (filters.dataType !== 'both') {
        query = query.eq('type', filters.dataType)
      }

      // Фильтр по категориям
      if (filters.categories.length > 0) {
        query = query.in('budget_folder_id', filters.categories)
      }

      // Фильтр по конкретному бюджету
      if (filters.budgetId) {
        query = query.eq('budget_folder_id', filters.budgetId)
      }

      const { data: transactions, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      // Группировка данных по категориям (значение — числовая сумма для PieChart)
      const categoryTotals = (transactions ?? []).reduce((acc: Record<string, number>, transaction: any) => {
        const folder = Array.isArray(transaction.budget_folders)
          ? transaction.budget_folders[0]
          : transaction.budget_folders

        const emoji = folder?.emoji ?? ''
        const name = folder?.name ?? 'Unknown'
        const categoryName = `${emoji} ${name}`.trim()

        acc[categoryName] = (acc[categoryName] ?? 0) + (transaction.amount ?? 0)
        return acc
      }, {})

      // Преобразование в формат для PieChart
      const pieData = Object.entries(categoryTotals).map(([name, value]) => ({
        name,
        value
      }))

      const colors = generatePieColors(pieData.length)
      const dataWithColors = pieData.map((item, index) => ({
        ...item,
        fill: colors[index]
      }))
      
      const dataWithPercentages = calculatePieChartPercentages(dataWithColors)
      setData(dataWithPercentages)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pie chart data')
      // Fallback to mock data in case of error
      const mockData = generateMockPieData()
      const colors = generatePieColors(mockData.length)
      const dataWithColors = mockData.map((item, index) => ({
        ...item,
        fill: colors[index]
      }))
      const dataWithPercentages = calculatePieChartPercentages(dataWithColors)
      setData(dataWithPercentages)
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
    refetch: fetchData
  }
}

// Hook for Line Chart data
export const useLineChartData = (filters: ChartFilters): UseChartDataReturn<LineChartData> => {
  // Используем оптимизированную версию если включена
  if (USE_OPTIMIZED_HOOKS) {
    return useOptimizedLineChartData(filters)
  }

  // Оригинальная реализация (без изменений)
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

      // Фильтр по типу данных
      if (filters.dataType !== 'both') {
        query = query.eq('type', filters.dataType)
      }

      // Фильтр по категориям
      if (filters.categories.length > 0) {
        query = query.in('budget_folder_id', filters.categories)
      }

      // Фильтр по конкретному бюджету
      if (filters.budgetId) {
        query = query.eq('budget_folder_id', filters.budgetId)
      }

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
          const amount =
              filters.dataType === 'expenses'
                  ? totals.expenses
                  : filters.dataType === 'income'
                      ? totals.income
                      : totals.expenses + totals.income
      
          return {
              date,
              amount
          }
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

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  }
}

// Hook for Bar Chart data
export const useBarChartData = (filters: ChartFilters): UseChartDataReturn<BarChartData> => {
  // Используем оптимизированную версию если включена
  if (USE_OPTIMIZED_HOOKS) {
    return useOptimizedBarChartData(filters)
  }

  // Оригинальная реализация (без изменений)
  const { session } = UserAuth()
  const [data, setData] = useState<BarChartData[]>([])
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
        .select(`
          amount,
          type,
          created_at,
          budget_folders!inner(name, emoji)
        `)
        .eq('user_id', session.user.id)
        .gte('created_at', filters.startDate.toISOString())
        .lte('created_at', filters.endDate.toISOString())

      // Фильтр по типу данных
      if (filters.dataType !== 'both') {
        query = query.eq('type', filters.dataType)
      }

      // Фильтр по категориям
      if (filters.categories.length > 0) {
        query = query.in('budget_folder_id', filters.categories)
      }

      // Фильтр по конкретному бюджету
      if (filters.budgetId) {
        query = query.eq('budget_folder_id', filters.budgetId)
      }

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
        const name = folder?.name ?? 'Unknown'
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

      // Преобразование в формат для BarChart (amount + fill)
      const barData: BarChartData[] = Object.entries(categoryTotals).map(([category, totals]) => {
        const amount =
          filters.dataType === 'expenses'
            ? totals.expenses
            : filters.dataType === 'income'
              ? totals.income
              : totals.expenses + totals.income

        const fill =
          filters.dataType === 'expenses'
            ? defaultChartColors.error
            : filters.dataType === 'income'
              ? defaultChartColors.success
              : defaultChartColors.primary

        return {
          category,
          amount,
          fill,
          emoji: totals.emoji
        }
      })

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

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  }
}

// Combined hook for all charts
export const useAllChartsData = (filters: ChartFilters) => {
  // Используем оптимизированную версию если включена
  if (USE_OPTIMIZED_HOOKS) {
    return useOptimizedAllChartsData(filters)
  }

  // Оригинальная реализация
  const pieChart = usePieChartData(filters)
  const lineChart = useLineChartData(filters)
  const barChart = useBarChartData(filters)

  return {
    pieChart,
    lineChart,
    barChart,
    isLoading: pieChart.isLoading || lineChart.isLoading || barChart.isLoading,
    error: pieChart.error || lineChart.error || barChart.error,
    refetchAll: () => {
      pieChart.refetch()
      lineChart.refetch()
      barChart.refetch()
    }
  }
}