import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Toggle } from '@/components/ui/toggle'
import { MultiSelect } from '@/components/ui/multi-select'
import { Calendar, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { ChartFilters as ChartFiltersType, ChartPeriod, ChartDataType } from '../../types/types'
import { useBudgets } from '../../hooks/useBudgets'

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
  const { budgets, isLoading: budgetsLoading } = useBudgets()

  const handlePeriodChange = (period: ChartPeriod) => {
    const now = new Date()
    let startDate = new Date()
    let endDate = new Date()

    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'custom':
        // For custom period, don't change dates
        return onFiltersChange({ ...filters, period })
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

  const handleDataTypeChange = (dataType: ChartDataType) => {
    onFiltersChange({ ...filters, dataType })
  }

  const handleCategoriesChange = (categories: string[]) => {
    onFiltersChange({ ...filters, categories })
  }

  const handleBudgetChange = (budgetId: string) => {
    onFiltersChange({ 
      ...filters, 
      budgetId: budgetId === 'all' ? null : budgetId 
    })
  }

  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString(),
    label: format(new Date(2024, i, 1), 'LLLL', { locale: enUS })
  }))

  // Generate year options (last 5 years + current + next)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 7 }, (_, i) => {
    const year = currentYear - 5 + i
    return {
      value: year.toString(),
      label: year.toString()
    }
  })

  // Prepare options for MultiSelect categories
  const categoryOptions = budgets.map(budget => ({
    value: budget.id,
    label: `${budget.emoji} ${budget.name}`
  }))

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Period */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Period</label>
            <div className="flex gap-2 flex-wrap">
              {(['week', 'month', 'quarter', 'year', 'custom'] as ChartPeriod[]).map((period) => (
                <Button
                  key={period}
                  variant={filters.period === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodChange(period)}
                >
                  {period === 'week' && 'Week'}
                  {period === 'month' && 'Month'}
                  {period === 'quarter' && 'Quarter'}
                  {period === 'year' && 'Year'}
                  {period === 'custom' && 'Custom'}
                </Button>
              ))}
            </div>
          </div>

          {/* Month/Year selector */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select
                value={filters.selectedMonth?.toString() || ''}
                onChange={(e) => handleMonthYearChange('month', e.target.value)}
              >
                <option value="" disabled>Select month</option>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select
                value={filters.selectedYear?.toString() || ''}
                onChange={(e) => handleMonthYearChange('year', e.target.value)}
              >
                <option value="" disabled>Select year</option>
                {yearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Data type toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Type</label>
            <div className="flex gap-2">
              <Toggle
                pressed={filters.dataType === 'expenses'}
                onPressedChange={() => handleDataTypeChange('expenses')}
                variant="outline"
              >
                Expenses
              </Toggle>
              <Toggle
                pressed={filters.dataType === 'income'}
                onPressedChange={() => handleDataTypeChange('income')}
                variant="outline"
              >
                Income
              </Toggle>
              <Toggle
                pressed={filters.dataType === 'both'}
                onPressedChange={() => handleDataTypeChange('both')}
                variant="outline"
              >
                Both
              </Toggle>
            </div>
          </div>

          {/* Categories filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categories</label>
            <MultiSelect
              options={categoryOptions}
              selected={filters.categories}
              onChange={handleCategoriesChange}
              placeholder="Select categories"
              disabled={budgetsLoading}
            />
          </div>

          {/* Budget filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Budget</label>
            <Select
              value={filters.budgetId || 'all'}
              onChange={(e) => handleBudgetChange(e.target.value)}
              disabled={budgetsLoading}
            >
              <option value="all">All budgets</option>
              {budgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.emoji} {budget.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Selected date range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Selected Period</label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(filters.startDate, 'dd.MM.yyyy', { locale: enUS })} - {format(filters.endDate, 'dd.MM.yyyy', { locale: enUS })}
              </span>
            </div>
          </div>

          {/* Indicators and loading status */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {filters.categories.length > 0 && (
                <span>Categories: {filters.categories.length}</span>
              )}
              {filters.budgetId && (
                <span className="ml-2">Budget selected</span>
              )}
            </div>
            
            {(isLoading || budgetsLoading) && (
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