import React from 'react'
import { cn } from '@/lib/utils'

interface BudgetProgressBarProps {
  spentAmount: number
  totalAmount: number
  type?: 'expense' | 'income'
  className?: string
}

const BudgetProgressBar = ({ spentAmount, totalAmount, type, className }: BudgetProgressBarProps) => {
  const percentage = totalAmount > 0 ? (spentAmount / totalAmount) * 100 : 0
  const remainingAmount = Math.max(totalAmount - spentAmount, 0)
  const budgetType: 'expense' | 'income' = type ?? 'expense'

  // Определяем цвет прогресс бара в зависимости от типа и процента заполнения
  const getProgressColor = () => {
    if (percentage >= 100) {
      return budgetType === 'expense' ? 'bg-red-500' : 'bg-green-500'
    }
    return 'bg-primary'
  }

  const getBackgroundColor = () => {
    if (percentage >= 100) {
      return budgetType === 'expense' ? 'bg-red-500/30' : 'bg-green-500/30'
    }
    return 'bg-primary/30'
  }

  return (
    <div className={cn("w-full flex flex-col gap-1", className)}>
      {/* Прогресс бар */}
      <div className={cn(
        "relative h-2 w-full overflow-hidden rounded-full transition-colors duration-300",
        getBackgroundColor()
      )}>
        <div
          className={cn(
            "h-full transition-all duration-300 ease-in-out",
            getProgressColor()
          )}
          style={{ 
            width: `${Math.min(percentage, 100)}%`
          }}
        />
      </div>
      
      {/* Информация о прогрессе */}
      <div className="flex justify-between text-xs text-secondary-black/70">
        <span>${spentAmount.toFixed(2)} spent</span>
        <span>${remainingAmount.toFixed(2)} left</span>
      </div>
    </div>
  )
}

export default BudgetProgressBar