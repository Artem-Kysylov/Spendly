import React from 'react'
import { ChartColorPalette, LineChartData, BarChartData } from '@/types/types'


// Цветовая палитра для графиков
export const defaultChartColors: ChartColorPalette = {
  primary: '#3B82F6',      // Brand blue
  secondary: '#6B7280',    // Gray
  success: '#10B981',      // Green (for income)
  warning: '#F59E0B',      // Amber
  error: '#EF4444',        // Red (for expenses)
  info: '#06B6D4',         // Cyan
  purple: '#8B5CF6',       // Purple
  pink: '#EC4899',         // Pink
  indigo: '#6366F1',       // Indigo
  teal: '#14B8A6',         // Teal
}

// Форматирование валюты
export const formatCurrency = (amount: number, currency: string = 'USD', abbreviated: boolean = false): string => {
  if (abbreviated && amount >= 1000) {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ${currency}`
    }
    return `${(amount / 1000).toFixed(1)}K ${currency}`
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Форматирование процентов
export const formatPercentage = (value: number, total: number): string => {
  return `${((value / total) * 100).toFixed(1)}%`
}

// Нормализация локали приложения к формату Intl
const normalizeLocale = (code?: string): string => {
  if (!code) return 'en-US'
  const map: Record<string, string> = {
    en: 'en-US',
    ru: 'ru-RU',
    uk: 'uk-UA',
    id: 'id-ID',
    ja: 'ja-JP',
    ko: 'ko-KR',
    hi: 'hi-IN',
  }
  return map[code] ?? code
}

const getWeekLabel = (locale: string): string => {
  const base = locale.split('-')[0]
  const labels: Record<string, string> = {
    en: 'Week',
    ru: 'Неделя',
    uk: 'Тиждень',
    id: 'Minggu',
    ja: '週',
    ko: '주',
    hi: 'सप्ताह',
  }
  return labels[base] ?? 'Week'
}

// Форматирование дат для графиков
export const formatChartDate = (
  dateString: string,
  period: 'day' | 'week' | 'month' | 'year',
  localeCode?: string
): string => {
  const date = new Date(dateString)
  const locale = normalizeLocale(localeCode)
  switch (period) {
    case 'day':
      return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    case 'week': {
      const weekLabel = getWeekLabel(locale)
      return `${weekLabel} ${getWeekNumber(date)}`
    }
    case 'month':
      return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' })
    case 'year':
      return date.getFullYear().toString()
    default:
      return dateString
  }
}

// Получение номера недели
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  return Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)
}

// Сортировка данных графиков по сумме
export const sortChartDataByAmount = <T extends { amount?: number; value?: number }>(data: T[]): T[] => {
  return [...data].sort((a, b) => {
    const aValue = a.amount ?? a.value ?? 0
    const bValue = b.amount ?? b.value ?? 0
    return bValue - aValue
  })
}

// Моковые данные для разработки
export const generateMockLineData = (): LineChartData[] => {
  const data: LineChartData[] = []
  const today = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    data.push({
      date: date.toISOString().split('T')[0],
      amount: Math.floor(Math.random() * 500) + 100,
      formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
  }
  
  return data
}

export const generateMockBarData = (): BarChartData[] => [
  { category: 'Food', amount: 450, fill: defaultChartColors.primary, emoji: '🍔' },
  { category: 'Transport', amount: 320, fill: defaultChartColors.success, emoji: '🚗' },
  { category: 'Entertainment', amount: 280, fill: defaultChartColors.warning, emoji: '🎬' },
  { category: 'Shopping', amount: 200, fill: defaultChartColors.error, emoji: '🛍️' },
  { category: 'Health', amount: 150, fill: defaultChartColors.info, emoji: '🏥' },
  { category: 'Other', amount: 100, fill: defaultChartColors.secondary, emoji: '📦' },
]

// Валидация данных графиков
export const validateChartData = <T>(data: T[]): boolean => {
  return Array.isArray(data) && data.length > 0
}

// Форматтеры для тултипов
export const customTooltipFormatter = (value: number, name: string): [string, string] => {
  return [formatCurrency(value), name]
}

// Форматирование диапазона дат
export const formatCompactRange = (
  startDate: Date,
  endDate: Date,
  localeCode?: string
): string => {
  const locale = normalizeLocale(localeCode)
  const start = startDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  const end = endDate.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined
  })
  return start === end ? start : `${start} - ${end}`
}

// Утилиты для сравнительных графиков

// Расчет предыдущего периода
export const calculatePreviousPeriod = (startDate: Date, endDate: Date): { previousStart: Date; previousEnd: Date } => {
  const duration = endDate.getTime() - startDate.getTime()
  const previousEnd = new Date(startDate.getTime() - 1) // День перед началом текущего периода
  const previousStart = new Date(previousEnd.getTime() - duration)
  
  return { previousStart, previousEnd }
}

// Определение типа периода
export const determinePeriodType = (startDate: Date, endDate: Date): 'day' | 'week' | 'month' | 'year' => {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 1) return 'day'
  if (diffDays <= 7) return 'week'
  if (diffDays <= 31) return 'month'
  return 'year'
}

// Генерация заголовка для сравнения
export const generateComparisonTitle = (startDate: Date, endDate: Date): string => {
  const periodType = determinePeriodType(startDate, endDate)
  
  switch (periodType) {
    case 'day':
      return 'Daily Comparison'
    case 'week':
      return 'Weekly Comparison'
    case 'month':
      return 'Monthly Comparison'
    case 'year':
      return 'Yearly Comparison'
    default:
      return 'Period Comparison'
  }
}

// Генерация меток для сравнения
export const generateComparisonLabels = (startDate: Date, endDate: Date): { current: string; previous: string } => {
  const periodType = determinePeriodType(startDate, endDate)
  
  switch (periodType) {
    case 'day':
      return { current: 'Today', previous: 'Yesterday' }
    case 'week':
      return { current: 'This Week', previous: 'Last Week' }
    case 'month':
      return { current: 'This Month', previous: 'Last Month' }
    case 'year':
      return { current: 'This Year', previous: 'Last Year' }
    default:
      return { current: 'Current Period', previous: 'Previous Period' }
  }
}

// Генерация описания для сравнения
export const generateComparisonDescription = (
  startDate: Date, 
  endDate: Date, 
  dataType: 'expenses' | 'income' | 'both' | 'Expenses' | 'Income' = 'expenses'
): string => {
  const periodType = determinePeriodType(startDate, endDate)
  const normalized = dataType.toLowerCase() as 'expenses' | 'income' | 'both'
  const dataTypeText = normalized === 'both' ? 'expenses and income' : normalized
  
  switch (periodType) {
    case 'day':
      return `Compare today's ${dataTypeText} with yesterday's`
    case 'week':
      return `Compare this week's ${dataTypeText} with last week's`
    case 'month':
      return `Compare this month's ${dataTypeText} with last month's`
    case 'year':
      return `Compare this year's ${dataTypeText} with last year's`
    default:
      return `Compare current period's ${dataTypeText} with previous period's`
  }
}

// Расчет процентного изменения
export const calculatePercentageChange = (currentValue: number, previousValue: number): number => {
  if (previousValue === 0) return currentValue > 0 ? 100 : 0
  return ((currentValue - previousValue) / previousValue) * 100
}

// Форматирование процентного изменения
export const formatPercentageChange = (change: number): { text: string; isPositive: boolean; isNeutral: boolean } => {
  const isPositive = change > 0
  const isNeutral = change === 0
  const text = isNeutral ? '0%' : `${isPositive ? '+' : ''}${change.toFixed(1)}%`
  
  return { text, isPositive, isNeutral }
}

// Группировка транзакций по дням
export const groupTransactionsByDay = (
  transactions: Array<{ amount: number; type: 'expense' | 'income'; created_at: string }>
): Record<string, { expenses: number; income: number }> => {
  return transactions.reduce((acc, transaction) => {
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
  }, {} as Record<string, { expenses: number; income: number }>)
}

// Генерация диапазона дат
export const generateDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = []
  const currentDate = new Date(startDate)
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return dates
}

// Получение суммы по типу данных
export const getAmountByDataType = (
  totals: { expenses: number; income: number }, 
  dataType: 'expenses' | 'income'
): number => {
  if (!totals) return 0
  return dataType === 'expenses' ? totals.expenses : totals.income
}

// Форматирование диапазона дат для отображения
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const locale =
    typeof window !== 'undefined' && typeof navigator !== 'undefined'
      ? (navigator.language || 'en-US')
      : 'en-US'
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }
  const start = startDate.toLocaleDateString(locale, options)
  const end = endDate.toLocaleDateString(locale, options)
  return `${start} - ${end}`
}

// Утилиты для Counters компонента
export const getPreviousMonthRange = (): { start: Date; end: Date } => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  // Предыдущий месяц
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
  
  const start = new Date(previousYear, previousMonth, 1)
  const end = new Date(previousYear, previousMonth + 1, 0) // последний день предыдущего месяца
  
  return { start, end }
}

export const getCurrentMonthRange = (): { start: Date; end: Date } => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date() // текущая дата
  
  return { start, end }
}

// Расчет процентного покрытия доходами расходов
export const calculateIncomeCoverage = (income: number, expenses: number): number => {
  if (expenses === 0) return income > 0 ? 100 : 0
  return (income / expenses) * 100
}

// Форматирование разности с предыдущим месяцем
export const formatMonthlyDifference = (
  previous: number, 
  current: number,
  opts?: { label?: string; currency?: string }
): string => {
  const currency = opts?.currency ?? 'USD'
  const label = opts?.label ?? 'vs last month'
  const difference = current - previous
  const isPositive = difference > 0
  if (difference === 0) return `±${formatCurrency(0, currency)} ${label}`
  const sign = isPositive ? '+' : ''
  return `${sign}${formatCurrency(Math.abs(difference), currency)} ${label}`
}