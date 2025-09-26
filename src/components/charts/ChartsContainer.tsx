'use client'

import React, { useRef, useState } from 'react'
import { LineChart } from './LineChart'
import { BarChart } from './BarChart'
import { ChartFilters } from './ChartFilters'
import { useAllChartsData } from '@/hooks/useChartData'
import { formatCompactRange } from '@/lib/chartUtils'
import type { ChartFilters as ChartFiltersType } from '@/types/types'

type ChartVisibility = {
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
    return { bar: true, line: true }
  })

  // Refs для экспорта и скролла (если понадобится)
  const barChartRef = useRef<HTMLDivElement>(null)
  const lineChartRef = useRef<HTMLDivElement>(null)

  // Получение данных для всех графиков
  const {
    barChart,
    lineChart,
    isLoading,
  } = useAllChartsData(filters)

  const getTypeLabel = (type: 'expenses' | 'income' | 'both') =>
    type === 'expenses' ? 'Expenses' : type === 'income' ? 'Income' : 'All transactions'

  // Фиксированная высота для обоих графиков
  const chartHeight = typeof window !== 'undefined' && window.innerWidth < 768 ? 320 : 400

  return (
    <div className="space-y-4 md:space-y-6">
      {showFilters && (
        <ChartFilters filters={filters} onFiltersChange={setFilters} isLoading={isLoading} />
      )}

      {(chartVisibility.bar || chartVisibility.line) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                height={chartHeight}
                orientation="vertical"
                showGrid={true}
                showTooltip={true}
                showLegend={false}
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
                title={`${getTypeLabel(filters.dataType)} Trends Over Time`}
                description={`Changes in ${filters.dataType.toLowerCase()} over time`}
                currency={currency}
                isLoading={lineChart.isLoading}
                error={lineChart.error}
                height={chartHeight}
                showGrid={true}
                showTooltip={true}
                showLegend={false}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}