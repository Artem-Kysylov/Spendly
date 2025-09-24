'use client'

import React, { useState, forwardRef } from 'react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatChartDate } from '@/lib/chartUtils'
import { CustomTooltip } from './CustomTooltip'
import { CustomLegend, LegendItem } from './CustomLegend'
import { LineChartProps } from '@/types/types'
import { ChartDescription } from './ChartDescription'

// Компонент LineChartComponent (forwardRef)
const LineChartComponent = forwardRef<HTMLDivElement, LineChartProps>(({ 
  data,
  title = "Expenses over time",
  description,
  showGrid = true,
  showTooltip = true,
  showLegend = true,
  height = 300,
  currency = "USD",
  isLoading = false,
  error = null,
  lineColor = "hsl(var(--primary))",
  strokeWidth = 2,
  xPeriod = 'month',
  className = ""
}, ref) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
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
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>Error loading data: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            <p>No data to display</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Форматирование данных для отображения
  const formattedData = data.map(item => ({
    ...item,
    formattedDate: formatChartDate(item.date, xPeriod)
  }))

  // Подготовка данных для легенды
  const legendData: LegendItem[] = [
    {
      value: data.reduce((sum, item) => sum + item.amount, 0),
      name: "Total amount",
      color: lineColor,
      payload: { dataKey: 'amount' }
    }
  ]

  // Обработчик hover для легенды
  const handleLegendHover = (item: LegendItem | null, index: number | null) => {
    setHoveredIndex(index)
  }

  return (
    <Card ref={ref} className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <ChartDescription>{description}</ChartDescription>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsLineChart data={formattedData}>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--muted-foreground))"
                opacity={0.3}
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
              tickFormatter={(value) => formatCurrency(value, currency, true)}
            />
            {showTooltip && (
              <Tooltip 
                content={<CustomTooltip currency={currency} />}
                cursor={{ stroke: lineColor, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
            )}
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke={lineColor}
              strokeWidth={strokeWidth}
              dot={{ 
                fill: lineColor, 
                strokeWidth: 2, 
                r: 4,
                style: {
                  filter: hoveredIndex === 0 ? 'brightness(1.2)' : 'none',
                  transition: 'filter 0.2s ease'
                }
              }}
              activeDot={{ 
                r: 6, 
                stroke: lineColor, 
                strokeWidth: 2,
                fill: 'hsl(var(--background))'
              }}
              animationDuration={800}
              name="Amount"
            />
          </RechartsLineChart>
        </ResponsiveContainer>
        
        {showLegend && (
          <CustomLegend
            payload={legendData}
            layout="horizontal"
            align="center"
            iconType="line"
            currency={currency}
            showValues={true}
            showBadges={true}
            interactive={false}
            onItemHover={handleLegendHover}
            spacing="normal"
          />
        )}
      </CardContent>
    </Card>
  )
})
LineChartComponent.displayName = 'LineChart'
export const LineChart = LineChartComponent