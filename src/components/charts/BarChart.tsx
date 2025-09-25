'use client'

import React, { useState, forwardRef } from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, generatePieColors } from '@/lib/chartUtils'
import { CustomTooltip } from './CustomTooltip'
import { CustomLegend, useLegendState, LegendItem } from './CustomLegend'
import { BarChartProps } from '@/types/types'
import { ChartDescription } from './ChartDescription'

// File: BarChart.tsx (BarChart component)
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
  const { hiddenItems, toggleItem } = useLegendState()
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

  const normalizedData = data.map(item => ({
    ...item,
    amount:
      typeof item.amount === 'number'
        ? item.amount
        : Number(String(item.amount).replace(/[^\d.-]/g, '')) || 0,
  }))

  const colors = generatePieColors(normalizedData.length)

  const filteredData = normalizedData.filter((_, index) => !hiddenItems.has(index))
  const dataToRender = filteredData

  const cleanLegendName = (name: string, emoji?: string) => {
    if (!emoji) return name.trim()
    const escaped = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return name.replace(new RegExp(`^${escaped}\\s*`), '').trim()
  }

  const legendData: LegendItem[] = normalizedData.map((item, index) => ({
    value: item.amount,
    name: cleanLegendName(item.category, item.emoji),
    color: item.fill || colors[index % colors.length],
    payload: item,
    emoji: item.emoji
  }))

  const handleLegendClick = (item: LegendItem, index: number) => {
    toggleItem(index)
  }

  const handleLegendHover = (item: LegendItem | null, index: number | null) => {
    setHoveredIndex(index)
  }

  const getBarColor = (index: number) => {
    const originalIndex = normalizedData.findIndex(item => dataToRender[index] === item)
    return normalizedData[originalIndex]?.fill || colors[originalIndex % colors.length]
  }

  const formatYAxisLabel = (value: number) => {
    return formatCurrency(value, currency, true)
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
          <RechartsBarChart 
            data={dataToRender}
            layout={orientation === "horizontal" ? "horizontal" : "vertical"}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--muted-foreground))"
                opacity={0.3}
              />
            )}
            <XAxis 
              type={orientation === "horizontal" ? "category" : "number"}
              dataKey={orientation === "horizontal" ? "category" : undefined}
              tickFormatter={orientation === "horizontal" ? undefined : formatYAxisLabel}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              height={orientation === "horizontal" ? 60 : undefined}
            />
            <YAxis 
              type={orientation === "horizontal" ? "number" : "category"}
              dataKey={orientation === "horizontal" ? undefined : "category"}
              tickFormatter={orientation === "horizontal" ? formatYAxisLabel : undefined}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={orientation === "horizontal" ? undefined : 100}
              domain={orientation === "horizontal" ? [0, 'dataMax'] : undefined}
            />
            {showTooltip && (
              <Tooltip 
                content={<CustomTooltip currency={currency} />}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              />
            )}
            <Bar 
              dataKey="amount" 
              fill={barColor}
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              name="Amount"
              minPointSize={2}
            >
              {dataToRender.map((entry, index) => {
                const originalIndex = normalizedData.findIndex(item => item === entry)
                const isHovered = hoveredIndex === originalIndex
                
                return (
                  <Cell 
                    key={`bar-${index}`} 
                    fill={getBarColor(index)}
                    style={{
                      filter: isHovered ? 'brightness(1.1)' : 'none',
                      transition: 'filter 0.2s ease'
                    }}
                  />
                )
              })}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
        
        {showLegend && (
          <CustomLegend
            payload={legendData}
            layout="horizontal"
            align="center"
            iconType="rect"
            currency={currency}
            showValues={true}
            showBadges={true}
            interactive={true}
            onItemClick={handleLegendClick}
            onItemHover={handleLegendHover}
            hiddenItems={hiddenItems}
            spacing="normal"
            showToggleAll={true}
          />
        )}
      </CardContent>
    </Card>
  )
})
BarChartComponent.displayName = 'BarChart'
export const BarChart = BarChartComponent