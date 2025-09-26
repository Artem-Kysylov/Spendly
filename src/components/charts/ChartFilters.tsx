// импорт и заголовок файла
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ChartFilters as ChartFiltersType, ChartPeriod } from '../../types/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface ChartFiltersProps {
  filters: ChartFiltersType
  onFiltersChange: (filters: ChartFiltersType) => void
  isLoading?: boolean
}

export const ChartFilters: React.FC<ChartFiltersProps> = ({
  filters,
  onFiltersChange,
  isLoading = false
}) => {
  const handlePeriodChange = (period: ChartPeriod) => {
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (period) {
      case 'week':
        // последние 7 дней
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        endDate = now
        break
      case 'month':
        // текущий месяц
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = now
        break
      case 'quarter': {
        // текущий квартал
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        endDate = now
        break
      }
      case 'year':
        // текущий год
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = now
        break
      case 'custom':
        // Для custom периода не меняем даты
        onFiltersChange({ ...filters, period })
        return
    }

    onFiltersChange({
      ...filters,
      period,
      startDate,
      endDate
    })
  }

  const handleMonthYearChange = (type: 'month' | 'year', value: string) => {
    const updates: Partial<ChartFiltersType> = {}
    
    if (type === 'month') {
      updates.selectedMonth = parseInt(value)
    } else {
      updates.selectedYear = parseInt(value)
    }

    onFiltersChange({ ...filters, ...updates })
  }

  // Список месяцев
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2024, i, 1), 'LLLL', { locale: enUS })
  }))

  // Список лет (последние 5 + текущий + следующий)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 7 }, (_, i) => {
    const year = currentYear - 5 + i
    return {
      value: year.toString(),
      label: year.toString()
    }
  })

  return (
    <Card className="w-full border-0 shadow-none rounded-none bg-transparent">
      <CardContent className="p-0">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Charts filters</h2>

          <div className="flex items-start flex-wrap gap-6">
            {/* Transactions Type (слева) */}
            <div className="space-y-2">
              <Tabs
                value={filters.dataType}
                onValueChange={(v) =>
                  onFiltersChange({ ...filters, dataType: v as 'expenses' | 'income' })
                }
              >
                <TabsList>
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                  <TabsTrigger value="income">Income</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Period (справа) */}
            <div className="space-y-2">
              <Tabs
                value={filters.period}
                onValueChange={(v) => handlePeriodChange(v as ChartPeriod)}
              >
                <TabsList>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="quarter">Quarter</TabsTrigger>
                  <TabsTrigger value="year">Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Loading status */}
          <div className="flex items-center justify-end">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}