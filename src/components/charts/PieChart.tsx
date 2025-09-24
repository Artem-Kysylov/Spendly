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

  // Обработка состояний загрузки и ошибок
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

  // Функция метки должна принимать PieLabelRenderProps
  const renderCustomLabel = (props: PieLabelRenderProps) => {
    const { percent } = props
    return typeof percent === 'number' ? `${(percent * 100).toFixed(1)}%` : ''
  }

  // Фильтрация данных на основе скрытых элементов
  const visibleData = data.filter((_, index) => !hiddenItems.has(index))

  // Подготовка данных для легенды
  const legendData: LegendItem[] = data.map((item, index) => ({
    value: item.value,
    name: item.name,
    color: colors[index % colors.length],
    payload: item,
    emoji: item.emoji  // Используем item.emoji вместо item.category_emoji
  }))

  // Обработчики для интерактивности
  const handleLegendClick = (item: LegendItem, index: number) => {
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
              data={visibleData}
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
              {visibleData.map((entry, index) => {
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
PieChartComponent.displayName = 'PieChart'
export const PieChart = PieChartComponent