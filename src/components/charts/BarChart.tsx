'use client'

// File: BarChart.tsx (BarChart component)
import React, { useState, forwardRef } from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, defaultChartColors } from '@/lib/chartUtils'
import { CustomTooltip } from './CustomTooltip'
import { BarChartProps } from '@/types/types'
import { ChartDescription } from './ChartDescription'

// BarChartComponent component (forwardRef)
const BarChartComponent = forwardRef<HTMLDivElement, BarChartProps>(({ 
  data,
  title = "Expenses by category",
  description,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  height = 300,
  currency = "USD",
  isLoading = false,
  error = null,
  barColor = "hsl(var(--primary))",
  orientation = "vertical",
  className = ""
}, ref) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (isLoading) {
    return (
      <Card className="w-full flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1" style={{ minHeight: height }}>
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1" style={{ minHeight: height }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-destructive">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1" style={{ minHeight: height }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">No data available</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Generate colors for bars
  const colors = Object.values(defaultChartColors)

  // Normalize data and add colors
  const normalizedData = data.map((item, index) => ({
    ...item,
    fill: item.fill || colors[index % colors.length],
    opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.6
  }))

  const formatYAxisLabel = (value: number) => {
    return formatCurrency(value, currency, true)
  }

  const formatXAxisLabel = (value: string) => {
    return value.trim()
  }

  return (
    <Card ref={ref} className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <ChartDescription>{description}</ChartDescription>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={normalizedData}
            layout={orientation === "horizontal" ? "vertical" : "horizontal"}
            barCategoryGap="25%"
            margin={{
              top: 36,
              right: 30,
              left: orientation === "horizontal" ? 80 : 20,
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
            
            {orientation === "horizontal" ? (
              <>
                <XAxis 
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxisLabel}
                />
                <YAxis 
                  type="category"
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatXAxisLabel}
                  width={90}
                />
              </>
            ) : (
              <>
                <XAxis 
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatXAxisLabel}
                  // Ровные подписи с эмодзи, меньше «воздуха» снизу
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
              </>
            )}
            
            {showTooltip && (
              <Tooltip 
                content={<CustomTooltip currency={currency} />}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
              />
            )}
            
            <Bar
              dataKey="amount"
              maxBarSize={48}
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            >
              {normalizedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill}
                  opacity={entry.opacity}
                />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>

    </Card>
  )
})
BarChartComponent.displayName = 'BarChart'
export const BarChart = BarChartComponent