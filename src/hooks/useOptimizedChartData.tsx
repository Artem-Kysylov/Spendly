'use client'

import { useQuery, useQueries } from '@tanstack/react-query'
import { UserAuth } from '../context/AuthContext'
import { 
  PieChartData, 
  LineChartData, 
  BarChartData, 
  ChartFilters, 
  UseChartDataReturn 
} from '@/types/types'
import { 
  fetchTransactions,
  aggregateDataByPeriod,
  aggregateDataByCategory,
  fetchPeriodStats,
  chartQueryKeys,
  TransactionData
} from '@/lib/chartQueries'


// Оптимизированный хук для данных Pie Chart с кэшированием
export const useOptimizedPieChartData = (filters: ChartFilters): UseChartDataReturn<PieChartData> => {
  const { session } = UserAuth()

  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: chartQueryKeys.transactions(filters),
    queryFn: () => fetchTransactions(session!.user.id, filters),
    enabled: !!session?.user?.id,
    staleTime: 3 * 60 * 1000, // 3 минуты для pie chart данных
  })

  const { data: categoryData = [] } = useQuery({
    queryKey: chartQueryKeys.categories(filters),
    queryFn: () => aggregateDataByCategory(transactions),
    enabled: transactions.length > 0,
    staleTime: 3 * 60 * 1000,
  })

  // Преобразование в формат PieChart
  const pieData: PieChartData[] = categoryData
    .filter(item => {
      // Фильтрация по типу данных
      if (filters.dataType === 'expenses') return item.expenses > 0
      if (filters.dataType === 'income') return item.income > 0
      return item.total > 0
    })
    .map(item => {
      const value = 
        filters.dataType === 'expenses' ? item.expenses :
        filters.dataType === 'income' ? item.income :
        item.total

      return {
        name: item.category,
        value,
        fill: '' // Будет заполнено ниже
      }
    })

  // Добавление цветов и процентов
  const colors = generatePieColors(pieData.length)
  const dataWithColors = pieData.map((item, index) => ({
    ...item,
    fill: colors[index]
  }))
  
  const finalData = calculatePieChartPercentages(dataWithColors)

  // Fallback к mock данным при ошибке
  const fallbackData = error ? (() => {
    const mockData = generateMockPieData()
    const colors = generatePieColors(mockData.length)
    const dataWithColors = mockData.map((item, index) => ({
      ...item,
      fill: colors[index]
    }))
    return calculatePieChartPercentages(dataWithColors)
  })() : finalData

  return {
    data: fallbackData,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch
  }
}

// Оптимизированный хук для данных Line Chart с кэшированием
export const useOptimizedLineChartData = (filters: ChartFilters): UseChartDataReturn<LineChartData> => {
  const { session } = UserAuth()

  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: chartQueryKeys.transactions(filters),
    queryFn: () => fetchTransactions(session!.user.id, filters),
    enabled: !!session?.user?.id,
    staleTime: 2 * 60 * 1000, // 2 минуты для line chart данных
  })

  const { data: aggregatedData = [] } = useQuery({
    queryKey: chartQueryKeys.aggregated(filters, filters.period),
    queryFn: () => aggregateDataByPeriod(transactions, filters.period),
    enabled: transactions.length > 0,
    staleTime: 2 * 60 * 1000,
  })

  // Преобразование в формат LineChart
  const lineData: LineChartData[] = aggregatedData.map(item => {
    const amount = 
      filters.dataType === 'expenses' ? item.expenses :
      filters.dataType === 'income' ? item.income :
      item.total

    return {
      date: item.period,
      amount,
      formattedDate: formatPeriodForDisplay(item.period, filters.period)
    }
  })

  // Fallback к mock данным при ошибке
  const fallbackData = error ? generateMockLineData() : lineData

  return {
    data: fallbackData,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch
  }
}

import {
  generateMockPieData, 
  generateMockLineData, 
  generateMockBarData,
  calculatePieChartPercentages,
  generatePieColors,
} from '@/lib/chartUtils'

export const useOptimizedBarChartData = (filters: ChartFilters): UseChartDataReturn<BarChartData> => {
  const { session } = UserAuth()

  const { data: transactions = [], isLoading, error, refetch } = useQuery({
    queryKey: chartQueryKeys.transactions(filters),
    queryFn: () => fetchTransactions(session!.user.id, filters),
    enabled: !!session?.user?.id,
    staleTime: 3 * 60 * 1000, // 3 минуты для bar chart данных
  })

  const { data: categoryData = [] } = useQuery({
    queryKey: chartQueryKeys.categories(filters),
    queryFn: () => aggregateDataByCategory(transactions),
    enabled: transactions.length > 0,
    staleTime: 3 * 60 * 1000,
  })

  // Преобразование в формат BarChart без цвета
  const baseBarData: Omit<BarChartData, 'fill'>[] = categoryData
    .filter(item => {
      if (filters.dataType === 'expenses') return item.expenses > 0
      if (filters.dataType === 'income') return item.income > 0
      return item.total > 0
    })
    .map(item => {
      const amount = 
        filters.dataType === 'expenses' ? item.expenses :
        filters.dataType === 'income' ? item.income :
        item.total

      return {
        category: item.category,
        amount,
        emoji: item.emoji
      }
    })

  // Назначаем уникальные цвета
  const colors = generatePieColors(baseBarData.length)
  const barData: BarChartData[] = baseBarData
    .map((item, index) => ({ ...item, fill: colors[index] }))
    .slice(0, 10)

  // Fallback к mock-данным
  const fallbackData = error ? generateMockBarData() : barData

  return {
    data: fallbackData,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch
  }
}

// Комбинированный хук для всех графиков с оптимизацией
export const useOptimizedAllChartsData = (filters: ChartFilters) => {
  const { session } = UserAuth()

  // Используем useQueries для параллельной загрузки данных
  const results = useQueries({
    queries: [
      {
        queryKey: chartQueryKeys.transactions(filters),
        queryFn: () => fetchTransactions(session!.user.id, filters),
        enabled: !!session?.user?.id,
        staleTime: 3 * 60 * 1000,
      },
      {
        queryKey: [...chartQueryKeys.all, 'stats', filters],
        queryFn: () => fetchPeriodStats(session!.user.id, filters),
        enabled: !!session?.user?.id,
        staleTime: 5 * 60 * 1000,
      }
    ]
  })

  const [transactionsQuery, statsQuery] = results

  const pieChart = useOptimizedPieChartData(filters)
  const lineChart = useOptimizedLineChartData(filters)
  const barChart = useOptimizedBarChartData(filters)

  return {
    pieChart,
    lineChart,
    barChart,
    stats: statsQuery.data,
    isLoading: transactionsQuery.isLoading || statsQuery.isLoading,
    error: transactionsQuery.error || statsQuery.error,
    refetchAll: () => {
      transactionsQuery.refetch()
      statsQuery.refetch()
      pieChart.refetch()
      lineChart.refetch()
      barChart.refetch()
    }
  }
}

// Вспомогательная функция для форматирования периодов
const formatPeriodForDisplay = (period: string, periodType: ChartFilters['period']): string => {
  switch (periodType) {
    case 'week':
      return new Date(period).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    case 'month':
      const [year, month] = period.split('-')
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      })
    case 'quarter':
      return period
    case 'year':
      return period
    default:
      return new Date(period).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
  }
}