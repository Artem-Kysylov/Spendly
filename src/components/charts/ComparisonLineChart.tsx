'use client'

import React, { useState, forwardRef } from 'react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatChartDate, generateComparisonTitle, generateComparisonLabels, generateComparisonDescription, formatPercentageChange } from '@/lib/chartUtils'
import { ComparisonLineChartProps } from '@/types/types'
import { ChartDescription } from './ChartDescription'

// Custom tooltip for comparison chart
const ComparisonTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{formatCurrency(entry.value, currency)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

// ComparisonLineChart component (forwardRef)
const ComparisonLineChartComponent = forwardRef<HTMLDivElement, ComparisonLineChartProps>(({ 
  data,
  title,
  description,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  height = 300,
  currency = "USD",
  isLoading = false,
  error = null,
  currentPeriodColor = "hsl(var(--primary))",
  previousPeriodColor = "hsl(var(--muted-foreground))",
  strokeWidth = 2,
  xPeriod = 'day',
  className = "",
  currentPeriodLabel,
  previousPeriodLabel,
  // Новые пропсы для динамического контента
  startDate,
  endDate,
  dataType = 'expenses',
  currentPeriodTotal,
  previousPeriodTotal,
  percentageChange
}, ref) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Генерируем динамический контент если не передан
  const dynamicTitle = title || (startDate && endDate ? generateComparisonTitle(startDate, endDate) : "Current vs Previous Period")
  const dynamicDescription = description || (startDate && endDate ? generateComparisonDescription(startDate, endDate, dataType) : "Compare current period with previous period")
  
  const labels = startDate && endDate ? generateComparisonLabels(startDate, endDate) : { current: "Current", previous: "Previous" }
  const finalCurrentLabel = currentPeriodLabel || labels.current
  const finalPreviousLabel = previousPeriodLabel || labels.previous

  // Форматируем процентное изменение
  const changeFormatted = percentageChange !== undefined ? formatPercentageChange(percentageChange) : null

  if (isLoading) {
    return (
      <Card ref={ref} className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{dynamicTitle}</CardTitle>
          <ChartDescription>{dynamicDescription}</ChartDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card ref={ref} className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{dynamicTitle}</CardTitle>
          <ChartDescription>{dynamicDescription}</ChartDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-destructive">Error loading chart: {error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card ref={ref} className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{dynamicTitle}</CardTitle>
          <ChartDescription>{dynamicDescription}</ChartDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">No data available</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format data for chart
  const chartData = data.map((item, index) => ({
    ...item,
    formattedDate: formatChartDate(item.date, xPeriod),
    opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.6
  }))

  return (
    <Card ref={ref} className={`w-full ${className} flex flex-col h-full`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{dynamicTitle}</CardTitle>
        <ChartDescription>{dynamicDescription}</ChartDescription>
        
        {/* Статистика и легенда */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: currentPeriodColor }}
              />
              <span className="text-muted-foreground">{finalCurrentLabel}</span>
              {currentPeriodTotal !== undefined && (
                <span className="font-medium">{formatCurrency(currentPeriodTotal, currency)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: previousPeriodColor }}
              />
              <span className="text-muted-foreground">{finalPreviousLabel}</span>
              {previousPeriodTotal !== undefined && (
                <span className="font-medium">{formatCurrency(previousPeriodTotal, currency)}</span>
              )}
            </div>
          </div>
          
          {/* Процентное изменение */}
          {changeFormatted && (
            <div className={`text-sm font-medium ${
              changeFormatted.isNeutral 
                ? 'text-muted-foreground' 
                : changeFormatted.isPositive 
                  ? 'text-green-600' 
                  : 'text-red-600'
            }`}>
              {changeFormatted.text}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="4 4"
                horizontal={true}
                vertical={true}
                stroke="hsl(var(--muted-foreground))"
                opacity={0.18}
              />
            )}
            <XAxis 
              dataKey="formattedDate"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value, currency)}
            />
            {showTooltip && (
              <Tooltip 
                content={<ComparisonTooltip currency={currency} />}
                cursor={{ stroke: currentPeriodColor, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
            )}
            
            {/* Current Period Line */}
            <Line
              type="monotone"
              dataKey="currentPeriod"
              stroke={currentPeriodColor}
              strokeWidth={strokeWidth}
              dot={{
                r: 4,
                strokeWidth: 2,
                fill: 'hsl(var(--background))'
              }}
              activeDot={{
                r: 6,
                strokeWidth: 2,
                fill: 'hsl(var(--background))'
              }}
              animationDuration={800}
              name={finalCurrentLabel}
            />
            
            {/* Previous Period Line */}
            <Line
              type="monotone"
              dataKey="previousPeriod"
              stroke={previousPeriodColor}
              strokeWidth={strokeWidth}
              strokeDasharray="5 5"
              dot={{
                r: 4,
                strokeWidth: 2,
                fill: 'hsl(var(--background))'
              }}
              activeDot={{
                r: 6,
                strokeWidth: 2,
                fill: 'hsl(var(--background))'
              }}
              animationDuration={800}
              name={finalPreviousLabel}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
      {/* AI suggestions placeholder */}
      <div className="px-6 pb-4">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm flex items-center gap-2">
            💡 Here will be AI suggestions
          </p>
        </div>
      </div>
    </Card>
  )
})

ComparisonLineChartComponent.displayName = 'ComparisonLineChart'
export const ComparisonLineChart = ComparisonLineChartComponent