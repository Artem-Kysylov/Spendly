'use client'

import React, { useState, forwardRef } from 'react'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercentage, generatePieColors } from '@/lib/chartUtils'
import { CustomTooltip } from './CustomTooltip'
import { ChartDescription } from './ChartDescription'
import { CustomLegend, useLegendState, LegendItem } from './CustomLegend'
import { PieChartProps, PieChartData } from '@/types/types'

const PieChartComponent = forwardRef<HTMLDivElement, PieChartProps>(({ 
  data,
  title = "Expenses by category",
  description,
  showLegend = true,
  showTooltip = true,
  height = 300,
  currency = "USD",
  isLoading = false,
  error = null,
  emptyMessage = "No data to display",
  className = ""
}, ref) => {
  const { hiddenItems, toggleItem } = useLegendState()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Handle loading and error states
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
            <p>{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const colors = generatePieColors(data.length)

  // Label function should accept PieLabelRenderProps
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: PieLabelRenderProps) => {
    return typeof percent === 'number' ? `${(percent * 100).toFixed(1)}%` : ''
  }

  // Filter data based on hidden items
  const filteredData = data.filter((_, index) => !hiddenItems.has(index))

  // Prepare data for legend
  const legendData: LegendItem[] = data.map((item, index) => ({
    value: item.value,
    name: item.name,
    color: colors[index % colors.length],
    emoji: item.emoji
  }))

  // Handlers for interactivity
  const handleLegendItemClick = (item: LegendItem, index: number) => {
    toggleItem(index)
  }

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
          <RechartsPieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {filteredData.map((entry, index) => {
                const originalIndex = data.findIndex(item => item === entry)
                const isHovered = hoveredIndex === originalIndex
                
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={colors[originalIndex % colors.length]}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    style={{
                      filter: isHovered ? 'brightness(1.1)' : 'none',
                      transition: 'filter 0.2s ease'
                    }}
                  />
                )
              })}
            </Pie>
            {showTooltip && (
              <Tooltip 
                content={<CustomTooltip currency={currency} />}
                cursor={{ fill: 'transparent' }}
              />
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
        
        {showLegend && (
          <CustomLegend
            payload={legendData}
            layout="horizontal"
            align="center"
            iconType="circle"
            currency={currency}
            showValues={true}
            showBadges={true}
            interactive={true}
            onItemClick={handleLegendItemClick}
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
PieChartComponent.displayName = 'PieChart'
export const PieChart = PieChartComponent