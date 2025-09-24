'use client'

import React, { useState, useEffect, useRef } from 'react'
import { PieChart } from './PieChart'
import { LineChart } from './LineChart'
import { BarChart } from './BarChart'
import { ChartFilters } from './ChartFilters'
import { ChartToggleControls, ChartVisibility } from './ChartToggleControls'
import { ExportControls } from './ExportControls'
import { useAllChartsData } from '@/hooks/useChartData'
import { ChartFilters as ChartFiltersType, ChartsRefs } from '@/types/types'

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
    categories: [],
    budgetId: null,
    dataType: 'both',
    selectedMonth: new Date().getMonth() + 1,
    selectedYear: new Date().getFullYear()
  },
  showFilters = true,
  showToggleControls = true,
  showExportControls = true,
  currency = "USD"
}) => {
  const [filters, setFilters] = useState<ChartFiltersType>(initialFilters)
  const [chartVisibility, setChartVisibility] = useState<ChartVisibility>(() => {
    // Загружаем настройки из localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('spendly-chart-visibility')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {
          // Fallback to default
        }
      }
    }
    return { pie: true, bar: true, line: true }
  })

  // Ref'ы для графиков
  const pieChartRef = useRef<HTMLDivElement>(null)
  const barChartRef = useRef<HTMLDivElement>(null)
  const lineChartRef = useRef<HTMLDivElement>(null)

  // Объект с ref'ами для ExportControls
  const chartsRefs: ChartsRefs = {
    pieChart: chartVisibility.pie ? pieChartRef : undefined,
    barChart: chartVisibility.bar ? barChartRef : undefined,
    lineChart: chartVisibility.line ? lineChartRef : undefined
  }
  
  const {
    pieChart,
    lineChart,
    barChart,
    isLoading,
    error,
    refetchAll,
  } = useAllChartsData(filters)

  // Сохраняем настройки видимости в localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('spendly-chart-visibility', JSON.stringify(chartVisibility))
    }
  }, [chartVisibility])

  const handleFiltersChange = (newFilters: ChartFiltersType) => {
    setFilters(newFilters)
  }

  const getResponsiveHeight = () => {
    if (typeof window === 'undefined') return 350
    return window.innerWidth < 768 ? 300 : 350
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {showFilters && (
        <ChartFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isLoading={isLoading}
        />
      )}
      
      {showToggleControls && (
        <ChartToggleControls
          visibility={chartVisibility}
          onVisibilityChange={setChartVisibility}
        />
      )}

      {showExportControls && (
        <ExportControls
          chartsRefs={chartsRefs}
          onExportStart={() => console.log('Export started')}
          onExportComplete={(success, error) => {
            if (success) {
              console.log('Export completed successfully')
            } else {
              console.error('Export failed:', error)
            }
          }}
        />
      )}
      
      {/* Адаптивная сетка для круговой и столбчатой диаграмм */}
      {(chartVisibility.pie || chartVisibility.bar) && (
        <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {/* Круговая диаграмма */}
          {chartVisibility.pie && (
            <div className="transition-all duration-300 ease-in-out">
              <PieChart
                ref={pieChartRef}
                data={pieChart.data}
                title="Расходы по категориям"
                description="Распределение расходов по категориям за выбранный период"
                currency={currency}
                isLoading={pieChart.isLoading}
                error={pieChart.error}
                height={getResponsiveHeight()}
                className="w-full"
              />
            </div>
          )}
          
          {/* Столбчатая диаграмма */}
          {chartVisibility.bar && (
            <div className="transition-all duration-300 ease-in-out">
              <BarChart
                ref={barChartRef}
                data={barChart.data}
                title="Сравнение категорий"
                description="Сравнение трат между категориями"
                currency={currency}
                isLoading={barChart.isLoading}
                error={barChart.error}
                height={getResponsiveHeight()}
                orientation="vertical"
                className="w-full"
              />
            </div>
          )}
        </div>
      )}
      
      {/* Линейная диаграмма на всю ширину */}
      {chartVisibility.line && (
        <div className="w-full transition-all duration-300 ease-in-out">
          <LineChart
            ref={lineChartRef}
            data={lineChart.data}
            title="Динамика расходов во времени"
            description="Изменение расходов во времени"
            currency={currency}
            isLoading={lineChart.isLoading}
            error={lineChart.error}
            height={typeof window !== 'undefined' && window.innerWidth < 768 ? 300 : 400}
            className="w-full"
          />
        </div>
      )}
    </div>
  )
}