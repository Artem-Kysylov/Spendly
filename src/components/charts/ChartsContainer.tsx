'use client'

import React, { useRef, useState } from 'react'
import { PieChart } from './PieChart'
import { LineChart } from './LineChart'
import { BarChart } from './BarChart'
import { ChartFilters } from './ChartFilters'
import { useAllChartsData } from '@/hooks/useChartData'
import type { ChartFilters as ChartFiltersType } from '@/types/types'

type ChartVisibility = {
  pie: boolean
  bar: boolean
  line: boolean
}

interface ChartsContainerProps {
  initialFilters?: ChartFiltersType
  showFilters?: boolean
  showToggleControls?: boolean
  showExportControls?: boolean
  currency?: string
}

export const ChartsContainer: React.FC<ChartsContainerProps> = ({
  initialFilters = {
    period: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date(),
    dataType: 'expenses',
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear(),
  },
  showFilters = true,
  // параметры ниже не используются внутри контейнера сейчас, оставлены ради совместимости пропсов
  showToggleControls: _showToggleControls = true,
  showExportControls: _showExportControls = true,
  currency = 'USD',
}) => {
  const [filters, setFilters] = useState<ChartFiltersType>(initialFilters)

  // Инициализация видимости графиков (на будущее), читаем из localStorage
  const [chartVisibility] = useState<ChartVisibility>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('spendly-chart-visibility')
        if (saved) return JSON.parse(saved) as ChartVisibility
      } catch {
        // ignore
      }
    }
    return { pie: true, bar: true, line: true }
  })

  // Refs для экспорта и скролла (если понадобится)
  const pieChartRef = useRef<HTMLDivElement>(null)
  const barChartRef = useRef<HTMLDivElement>(null)
  const lineChartRef = useRef<HTMLDivElement>(null)

  const { pieChart, lineChart, barChart, isLoading } = useAllChartsData(filters)

  // Хелперы: формат периода и маппинг типа
  const formatCompactRange = (start: Date, end: Date) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate()
    const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()
    const sameYear = start.getFullYear() === end.getFullYear()

    if (sameDay) {
      return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`
    }
    if (sameMonth) {
      return `${start.getDate()}–${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`
    }
    if (sameYear) {
      return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${start.getFullYear()}`
    }
    return `${start.getDate()} ${months[start.getMonth()]} ${start.getFullYear()} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`
  }

  const getTypeLabel = (type: 'expenses' | 'income' | 'both') =>
    type === 'expenses' ? 'Expenses' : type === 'income' ? 'Income' : 'All transactions'

  const getResponsiveHeight = () => {
    if (typeof window === 'undefined') return 350
    return window.innerWidth < 768 ? 300 : 350
  }

  // Заголовки/описания
  const pieTitle = 'Category Comparison'
  const pieDescription = `${getTypeLabel(filters.dataType)} for ${formatCompactRange(
    filters.startDate,
    filters.endDate
  )}`

  // Подготовка данных пустого состояния Pie
  const visiblePieData = Array.isArray(pieChart.data)
    ? pieChart.data.filter((d) => (d?.value ?? 0) > 0)
    : []
  const showPieEmptyState = !pieChart.isLoading && !pieChart.error && visiblePieData.length === 0
  const emptyMessage =
    filters.dataType === 'income'
      ? 'No income for the selected period'
      : 'No expenses for the selected period'

  return (
    <div className="space-y-4 md:space-y-6">
      {showFilters && (
        <ChartFilters filters={filters} onFiltersChange={setFilters} isLoading={isLoading} />
      )}

      {(chartVisibility.pie || chartVisibility.bar || chartVisibility.line) && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Pie chart */}
          {chartVisibility.pie && (
            <div className="transition-all duration-300 ease-in-out">
              {showPieEmptyState ? (
                <div
                  className="flex flex-col items-center justify-center rounded-lg border bg-card text-card-foreground p-6"
                  style={{ height: getResponsiveHeight() }}
                >
                  <p className="text-base font-medium">{emptyMessage}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Selected period: {formatCompactRange(filters.startDate, filters.endDate)}
                  </p>
                </div>
              ) : (
                <PieChart
                  ref={pieChartRef}
                  data={pieChart.data}
                  title={pieTitle}
                  description={pieDescription}
                  currency={currency}
                  isLoading={pieChart.isLoading}
                  error={pieChart.error}
                  height={getResponsiveHeight()}
                  className="w-full"
                />
              )}
            </div>
          )}

          {/* Bar chart */}
          {chartVisibility.bar && (
            <div className="transition-all duration-300 ease-in-out">
              <BarChart
                ref={barChartRef}
                data={barChart.data}
                title="Category Comparison"
                description={`${getTypeLabel(filters.dataType)} for ${formatCompactRange(
                  filters.startDate,
                  filters.endDate
                )}`}
                currency={currency}
                isLoading={barChart.isLoading}
                error={barChart.error}
                height={getResponsiveHeight()}
                orientation="vertical"
                className="w-full"
              />
            </div>
          )}

          {/* Line chart */}
          {chartVisibility.line && (
            <div className="transition-all duration-300 ease-in-out">
              <LineChart
                ref={lineChartRef}
                data={lineChart.data}
                title="Expense Trends Over Time"
                description="Changes in expenses over time"
                currency={currency}
                isLoading={lineChart.isLoading}
                error={lineChart.error}
                height={getResponsiveHeight()}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}