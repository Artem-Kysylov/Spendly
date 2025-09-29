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

  // Определяем цвет прогресс бара с фирменными синими цветами
  const getProgressColor = () => {
    if (percentage >= 100) {
      return budgetType === 'expense' ? 'bg-red-500' : 'bg-green-500'
    }
    // Используем фирменный синий цвет для нормального состояния
    return 'bg-blue-500'
  }

  const getBackgroundColor = () => {
    if (percentage >= 100) {
      return budgetType === 'expense' ? 'bg-red-100' : 'bg-green-100'
    }
    // Используем светло-синий фон для нормального состояния
    return 'bg-blue-100'
  }

  return (
    <div className={cn("w-full flex flex-col gap-1", className)}>
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
      
      {/* Информация о прогрессе */}
      <div className="flex justify-between text-xs text-gray-600">
        <span className="font-medium">${spentAmount.toFixed(0)} spent</span>
        <span>${remainingAmount.toFixed(0)} left</span>
      </div>
    </div>
  )
}

export default BudgetProgressBar