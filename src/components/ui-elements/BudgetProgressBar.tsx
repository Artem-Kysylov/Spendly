import React from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/chartUtils'
import useDeviceType from '@/hooks/useDeviceType'

interface BudgetProgressBarProps {
  spentAmount: number
  totalAmount: number
  type?: 'expense' | 'income'
  className?: string
  spentLabel?: string
  leftLabel?: string
  currency?: string
  accentColorHex?: string
  compact?: boolean
}

function BudgetProgressBar({ spentAmount, totalAmount, type, className, spentLabel, leftLabel, currency = 'USD', accentColorHex, compact = false }: BudgetProgressBarProps) {
  const { isMobile } = useDeviceType()
  const percentage = totalAmount > 0 ? (spentAmount / totalAmount) * 100 : 0
  const remainingAmount = Math.max(totalAmount - spentAmount, 0)
  const budgetType: 'expense' | 'income' = type ?? 'expense'

  const isColoredCard = Boolean(accentColorHex)

  const getProgressColor = () => {
    if (percentage >= 100) {
      return budgetType === 'expense' ? 'bg-red-500' : 'bg-green-500'
    }
    return isColoredCard ? 'bg-primary' : 'bg-primary'
  }

  const getBackgroundColor = () => {
    if (isColoredCard) return 'bg-white'
    if (percentage >= 100) {
      return budgetType === 'expense' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-green-100 dark:bg-green-900/20'
    }
    return 'bg-blue-100 dark:bg-primary/20'
  }

  const labelColorClass = isColoredCard ? 'text-black dark:text-black' : 'text-gray-700 dark:text-white'
  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      {/* Компактный режим (мобилка): только трек */}
      {isMobile && compact ? (
        <div className={cn(
          "relative h-2.5 w-full overflow-hidden rounded-full transition-colors duration-300",
          getBackgroundColor()
        )}>
          <div
            className={cn(
              "h-full transition-all duration-500 ease-in-out rounded-full",
              getProgressColor()
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      ) : (
        <>
          {/* Стандартная верстка */}
          <div className={cn(
            "relative h-2.5 w-full overflow-hidden rounded-full transition-colors duration-300",
            getBackgroundColor()
          )}>
            <div
              className={cn(
                "h-full transition-all duration-500 ease-in-out rounded-full",
                getProgressColor()
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <div className={cn("grid grid-cols-2 text-xs", labelColorClass)}>
            <span className="font-medium text-left justify-self-start">
              {formatCurrency(spentAmount, currency)} {spentLabel ?? (budgetType === 'income' ? 'collected' : 'spent')}
            </span>
            <span className="text-right justify-self-end">
              {formatCurrency(remainingAmount, currency)} {leftLabel ?? (budgetType === 'income' ? 'left to goal' : 'left')}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default BudgetProgressBar