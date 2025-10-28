import React from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/chartUtils'

interface BudgetProgressBarProps {
  spentAmount: number
  totalAmount: number
  type?: 'expense' | 'income'
  className?: string
  spentLabel?: string
  leftLabel?: string
  currency?: string
}

function BudgetProgressBar({ spentAmount, totalAmount, type, className, spentLabel, leftLabel, currency = 'USD' }: BudgetProgressBarProps) {
  const percentage = totalAmount > 0 ? (spentAmount / totalAmount) * 100 : 0
  const remainingAmount = Math.max(totalAmount - spentAmount, 0)
  const budgetType: 'expense' | 'income' = type ?? 'expense'

  // Определяем цвет прогресс бара с поддержкой темной темы
  const getProgressColor = () => {
    if (percentage >= 100) {
      return budgetType === 'expense' ? 'bg-red-500' : 'bg-green-500'
    }
    // Используем фирменный синий цвет для нормального состояния
    return 'bg-primary'
  }

  const getBackgroundColor = () => {
    if (percentage >= 100) {
      return budgetType === 'expense' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-green-100 dark:bg-green-900/20'
    }
    // Используем светло-синий фон для нормального состояния с поддержкой темной темы
    return 'bg-blue-100 dark:bg-primary/20'
  }

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      {/* Прогресс бар */}
      <div className={cn(
        "relative h-2.5 w-full overflow-hidden rounded-full transition-colors duration-300",
        getBackgroundColor()
      )}>
        <div
          className={cn(
            "h-full transition-all duration-500 ease-in-out rounded-full",
            getProgressColor()
          )}
          style={{ 
            width: `${Math.min(percentage, 100)}%`
          }}
        />
      </div>
      {/* Информация о прогрессе: метки под краями трека */}
      <div className="grid grid-cols-2 text-xs text-gray-700 dark:text-white">
        <span className="font-medium text-left justify-self-start">
          {formatCurrency(spentAmount, currency)} {spentLabel ?? 'spent'}
        </span>
        <span className="text-right justify-self-end">
          {formatCurrency(Math.max(totalAmount - spentAmount, 0), currency)} {leftLabel ?? 'left'}
        </span>
      </div>
    </div>
  )
}

export default BudgetProgressBar