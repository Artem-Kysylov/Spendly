'use client'

import React, { forwardRef } from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/chartUtils'
import { CustomTooltip } from './CustomTooltip'
import { ChartDescription } from './ChartDescription'
import { ChartFilters } from '@/types/types'
import { useAISuggestions } from '@/hooks/useAISuggestions'

// Интерфейс для данных бар-чарта трат
interface ExpensesBarData {
  period: string      // "Week 1", "Week 2" или "Jan", "Feb"
  amount: number      // Сумма трат за период
  fill: string        // Цвет столбца
}

interface ExpensesBarChartProps {
  data: ExpensesBarData[]
  filters: ChartFilters
  title?: string
  description?: string
  showGrid?: boolean
  showTooltip?: boolean
  height?: number
  currency?: string
  isLoading?: boolean
  error?: string | null
  emptyMessage?: string
  className?: string
}

// Компонент ExpensesBarChart
const ExpensesBarChartComponent = forwardRef<HTMLDivElement, ExpensesBarChartProps>(({ 
  data,
  filters,
  title,
  description,
  showGrid = true,
  showTooltip = true,
  height = 300,
  currency = "USD",
  isLoading = false,
  error = null,
  emptyMessage = "No expenses data available",
  className = ""
}, ref) => {
  
  const { text: tip, loading: tipLoading, error: tipError, isRateLimited, fetchSuggestion } = useAISuggestions()

  const refreshTip = () => {
    const prompt = `Analyze my current ${filters.dataType} trends and suggest budgeting improvements for the selected period.`
    fetchSuggestion(prompt)
  }

  // Генерируем заголовок на основе фильтров
  const generateTitle = () => {
    if (title) return title
    
    const periodText = filters.period === 'Week' ? 'Weekly' : 'Monthly'
    const typeText = filters.dataType === 'Expenses' ? 'Expenses' : 'Income'
    return `${periodText} ${typeText}`
  }

  // Генерируем описание на основе фильтров
  const generateDescription = () => {
    if (description) return description
    
    const periodText = filters.period === 'Week' ? 'weeks' : 'months'
    const typeText = filters.dataType === 'Expenses' ? 'expenses' : 'income'
    return `Your ${typeText} breakdown by ${periodText}`
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{generateTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{generateTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-destructive">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{generateTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">{emptyMessage}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatYAxisLabel = (value: number) => {
    return formatCurrency(value, currency, true)
  }

  return (
    <Card ref={ref} className={`w-full ${className} flex flex-col h-full`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{generateTitle()}</CardTitle>
        <ChartDescription>{generateDescription()}</ChartDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            margin={{
              top: 36,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="4 4"
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--muted-foreground))"
                opacity={0.18}
              />
            )}
            
            <XAxis 
              dataKey="period"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              height={28}
              tickMargin={4}
              interval={0}
            />
            
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxisLabel}
            />
            
            {showTooltip && (
              <Tooltip 
                content={<CustomTooltip currency={currency} />}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
              />
            )}
            
            <Bar
              dataKey="amount"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
        
        {/* AI Suggestions */}
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">💡 AI suggestions</span>
            <button className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200" onClick={refreshTip} disabled={tipLoading || isRateLimited}>
              {tipLoading ? 'Loading…' : 'Refresh tip'}
            </button>
          </div>
          {tipError && <div className="text-xs text-amber-700 mt-1">{tipError}</div>}
          <div className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{tip}</div>
        </div>
      </CardContent>
    </Card>
  )
})

ExpensesBarChartComponent.displayName = 'ExpensesBarChart'
export const ExpensesBarChart = ExpensesBarChartComponent
export type { ExpensesBarData, ExpensesBarChartProps }