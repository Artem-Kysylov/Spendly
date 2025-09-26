import React from 'react'
import { ChartColorPalette, PieChartData, LineChartData, BarChartData } from '@/types/types'

// Default color palette for charts
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

// Generate colors for pie chart segments
export const generatePieColors = (dataLength: number): string[] => {
  const colors = Object.values(defaultChartColors)
  const result: string[] = []
  
  for (let i = 0; i < dataLength; i++) {
    result.push(colors[i % colors.length])
  }
  
  return result
}

// Format currency for display
export const formatCurrency = (amount: number, currency: string = 'USD', abbreviated: boolean = false): string => {
  if (abbreviated && amount >= 1000) {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ${currency}`
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K ${currency}`
    }
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format percentage for display
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%'
  const percentage = (value / total) * 100
  return `${percentage.toFixed(1)}%`
}

// Calculate percentages for pie chart data
export const calculatePieChartPercentages = (data: PieChartData[]): PieChartData[] => {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  
  return data.map(item => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0
  }))
}

// Format date for line chart
export const formatChartDate = (dateString: string, period: 'day' | 'week' | 'month' | 'year'): string => {
  const date = new Date(dateString)
  
  switch (period) {
    case 'day':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    case 'week':
      return `Week ${getWeekNumber(date)}`
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    case 'year':
      return date.getFullYear().toString()
    default:
      return dateString
  }
}

// Get week number of the year
const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Sort chart data by amount (descending)
export const sortChartDataByAmount = <T extends { amount?: number; value?: number }>(data: T[]): T[] => {
  return [...data].sort((a, b) => {
    const aValue = a.amount || a.value || 0
    const bValue = b.amount || b.value || 0
    return bValue - aValue
  })
}

// Generate mock data for development (temporary)
export const generateMockPieData = (): PieChartData[] => [
  { name: 'Food', value: 400, fill: defaultChartColors.primary },
  { name: 'Transport', value: 300, fill: defaultChartColors.success },
  { name: 'Entertainment', value: 200, fill: defaultChartColors.warning },
  { name: 'Shopping', value: 150, fill: defaultChartColors.error },
  { name: 'Other', value: 100, fill: defaultChartColors.secondary },
]

export const generateMockLineData = (): LineChartData[] => {
  const data: LineChartData[] = []
  const today = new Date()
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    data.push({
      date: date.toISOString().split('T')[0],
      amount: Math.floor(Math.random() * 200) + 50,
      formattedDate: formatChartDate(date.toISOString(), 'day')
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

// Validate chart data
export const validateChartData = <T>(data: T[]): boolean => {
  return Array.isArray(data) && data.length > 0
}

// Interface for CustomTooltip props
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    name: string
    color: string
  }>
  label?: string
  currency?: string
}

// Custom tooltip component for Recharts
export const CustomTooltip: React.FC<CustomTooltipProps> = ({ 
  active, 
  payload, 
  label, 
  currency = 'USD' 
}) => {
  if (active && payload && payload.length) {
    return React.createElement(
      'div',
      { className: 'bg-background border border-border rounded-lg shadow-lg p-3' },
      [
        React.createElement(
          'p',
          { key: 'label', className: 'text-sm font-medium text-foreground' },
          label
        ),
        ...payload.map((entry, index) =>
          React.createElement(
            'p',
            { key: index, className: 'text-sm', style: { color: entry.color } },
            `${entry.name}: ${formatCurrency(entry.value, currency)}`
          )
        ),
      ]
    )
  }
  return null
}

// Custom tooltip formatter for Recharts
export const customTooltipFormatter = (value: number, name: string): [string, string] => {
  return [formatCurrency(value), name]
}

// Custom label formatter for pie chart
export const customPieLabelFormatter = (entry: PieChartData): string => {
  return `${entry.name}: ${formatPercentage(entry.value, 1000)}` // 1000 is placeholder total
}

// Format date range for display in chart descriptions
export const formatCompactRange = (startDate: Date, endDate: Date): string => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  // If same day
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  
  // If same month and year
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`
  }
  
  // If same year
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  
  // Different years
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}