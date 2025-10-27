'use client'

import React, { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ComparisonLineChart } from '@/components/charts'
import { BarChart } from './BarChart'
import { TransactionsFilter } from '@/components/ui-elements'
import { useAllChartsData, useComparisonLineChartData } from '@/hooks/useChartData'
import { formatCompactRange } from '@/lib/chartUtils'
import type { ChartFilters as ChartFiltersType, ChartPeriod, ChartDataType } from '@/types/types'
import { useTranslations } from 'next-intl'

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

const DEFAULT_FILTERS: ChartFiltersType = {
  period: 'Week',
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 7),
  endDate: new Date(),
  dataType: 'Expenses',
  selectedMonth: new Date().getMonth() + 1,
  selectedYear: new Date().getFullYear(),
}

export const ChartsContainer = (
  {
    initialFilters = DEFAULT_FILTERS,
    showFilters = true,
    showToggleControls = true,
    showExportControls = true,
    currency = 'USD',
  }: ChartsContainerProps = {}
) => {
  const [filters, setFilters] = useState<ChartFiltersType>(initialFilters)
  const tCharts = useTranslations('charts')

  // Добавляем производные ключи для локализации заголовка/описания
  const periodKey = filters.period === 'Month' ? 'monthly' : 'weekly'
  const typeKey = filters.dataType === 'Expenses' ? 'expenses' : 'income'

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
    error
  } = useAllChartsData(filters)

  // Добавляем хук для сравнительного графика
  const comparisonChart = useComparisonLineChartData(filters)

  // Обработчики изменения фильтров
  const handleTransactionTypeChange = (type: ChartDataType) => {
    setFilters(prev => ({ ...prev, dataType: type }))
  }

  const handleDatePeriodChange = (period: ChartPeriod) => {
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (period) {
      case 'Week':
        // последние 7 дней
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        endDate = now
        break
      case 'Month':
        // текущий месяц
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = now
        break
    }

    setFilters(prev => ({
      ...prev,
      period,
      startDate,
      endDate,
      selectedMonth: period === 'Month' ? now.getMonth() + 1 : prev.selectedMonth,
      selectedYear: now.getFullYear()
    }))
  }

  const getTypeLabel = (type: ChartDataType) =>
    type === 'Expenses' ? tCharts('labels.expenses') : tCharts('labels.income')

  // Единая высота графиков
  const chartHeight = 240

  return (
    <motion.div 
      className="space-y-4 md:space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {showFilters && (
        <>
          <motion.h2 
            className="text-[25px] font-semibold"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          >
            {tCharts('titles.analytics')}
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
          >
            <TransactionsFilter
              transactionType={filters.dataType}
              onTransactionTypeChange={handleTransactionTypeChange}
              datePeriod={filters.period}
              onDatePeriodChange={handleDatePeriodChange}
              className="mb-6"
            />
          </motion.div>
        </>
      )}

      {(chartVisibility.bar || chartVisibility.line) && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        >
          {chartVisibility.bar && (
            <motion.div 
              style={{ willChange: 'opacity, transform' }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
            >
              <BarChart
                ref={barChartRef}
                data={barChart.data}
                title={tCharts('titles.comparisonBar')}
                description={`${getTypeLabel(filters.dataType)} ${tCharts('labels.for')} ${formatCompactRange(
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
            </motion.div>
          )}

          {chartVisibility.line && (
            <motion.div 
              style={{ willChange: 'opacity, transform' }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
            >
              <ComparisonLineChart
                ref={lineChartRef}
                data={comparisonChart.data}
                startDate={filters.startDate}
                endDate={filters.endDate}
                dataType={filters.dataType.toLowerCase() as 'expenses' | 'income'}
                currentPeriodTotal={comparisonChart.currentPeriodTotal}
                previousPeriodTotal={comparisonChart.previousPeriodTotal}
                percentageChange={comparisonChart.percentageChange}
                currency={currency}
                isLoading={comparisonChart.isLoading}
                error={comparisonChart.error}
                height={chartHeight}
                showGrid={true}
                showTooltip={true}
                showLegend={false}
                currentPeriodLabel={tCharts('comparison.labels.current')}
                previousPeriodLabel={tCharts('comparison.labels.previous')}
                title={tCharts(`comparison.titles.${periodKey}`)}
                description={tCharts(`comparison.descriptions.${periodKey}.${typeKey}`)}
                className="w-full"
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}