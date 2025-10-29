"use client"

import React from 'react'
import { Select } from '@/components/ui/select'
import { useTranslations } from 'next-intl'

export interface TransactionsFilterProps {
  transactionType: 'Expenses' | 'Income'
  onTransactionTypeChange: (type: 'Expenses' | 'Income') => void
  datePeriod: 'Week' | 'Month'
  onDatePeriodChange: (period: 'Week' | 'Month') => void
  className?: string
}

const TransactionsFilter: React.FC<TransactionsFilterProps> = ({
  transactionType,
  onTransactionTypeChange,
  datePeriod,
  onDatePeriodChange,
  className = ''
}) => {
  const tTransactions = useTranslations('transactions')
  const tCharts = useTranslations('charts')
  const tModals = useTranslations('modals')
  const tFilters = useTranslations('filters')
  return (
    <div className={`flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 ${className}`}>
      {/* Type Selector */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label className="text-sm font-medium text-secondary-black dark:text-white">
          {tTransactions('table.headers.type')}
        </label>
        <div className="relative">
          <Select
            value={transactionType}
            onChange={(e) => onTransactionTypeChange(e.target.value as 'Expenses' | 'Income')}
            className="w-full sm:min-w-[140px] bg-white dark:bg-background text-black dark:text-white pl-4 pr-[40px] h-[50px] rounded-md appearance-none border border-input"
          >
            <option value="Expenses">{tCharts('labels.expenses')}</option>
            <option value="Income">{tCharts('labels.income')}</option>
          </Select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-[16px] pointer-events-none text-black dark:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Date Period Selector */}
      <div className="flex flex-col gap-1 w-full sm:w-auto">
        <label className="text-sm font-medium text-secondary-black dark:text-white">
          {tTransactions('table.headers.date')}
        </label>
        <div className="relative">
          <Select
            value={datePeriod}
            onChange={(e) => onDatePeriodChange(e.target.value as 'Week' | 'Month')}
            className="w-full sm:min-w-[140px] bg-white dark:bg-background text-black dark:text-white pl-4 pr-[40px] h-[50px] rounded-md appearance-none border border-input"
          >
            <option value="Week">{tFilters('options.week')}</option>
            <option value="Month">{tFilters('options.month')}</option>
          </Select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-[16px] pointer-events-none text-black dark:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionsFilter