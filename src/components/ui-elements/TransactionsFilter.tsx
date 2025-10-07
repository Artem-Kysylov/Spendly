"use client"

import React from 'react'
import { Select } from '@/components/ui/select'

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
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Type Selector */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white">Type</label>
        <div className="relative">
          <Select
            value={transactionType}
            onChange={(e) => onTransactionTypeChange(e.target.value as 'Expenses' | 'Income')}
            className="min-w-[140px] bg-background pl-4 pr-[40px] h-[50px] rounded-md appearance-none"
          >
            <option value="Expenses">Expense</option>
            <option value="Income">Income</option>
          </Select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-[16px] pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Date Period Selector */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-white">Date</label>
        <div className="relative">
          <Select
            value={datePeriod}
            onChange={(e) => onDatePeriodChange(e.target.value as 'Week' | 'Month')}
            className="min-w-[140px] bg-background pl-4 pr-[40px] h-[50px] rounded-md appearance-none"
          >
            <option value="Week">Week</option>
            <option value="Month">Month</option>
          </Select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-[16px] pointer-events-none">
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