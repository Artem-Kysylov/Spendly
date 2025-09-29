import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrendArrowProps {
  trend: number // процентное изменение
  variant: 'expense' | 'income'
  className?: string
}

const TrendArrow = ({ trend, variant, className }: TrendArrowProps) => {
  const isPositive = trend > 0
  const isNeutral = trend === 0
  
  // Для расходов: рост = плохо (красный), снижение = хорошо (зеленый)
  // Для доходов: рост = хорошо (зеленый), снижение = плохо (красный)
  const getColorClass = () => {
    if (isNeutral) return 'text-gray-500'
    
    if (variant === 'expense') {
      return isPositive ? 'text-red-500' : 'text-green-500'
    } else {
      return isPositive ? 'text-green-500' : 'text-red-500'
    }
  }

  const formatTrend = () => {
    if (isNeutral) return '0%'
    return `${isPositive ? '+' : ''}${trend.toFixed(1)}%`
  }

  if (isNeutral) {
    return (
      <div className={cn("flex items-center gap-1 text-sm", className)}>
        <span className="text-gray-500">—</span>
        <span className="text-gray-500">0%</span>
      </div>
    )
  }

  const Icon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className={cn("flex items-center gap-1 text-sm", className)}>
      <Icon className={cn("h-4 w-4", getColorClass())} />
      <span className={getColorClass()}>{formatTrend()}</span>
    </div>
  )
}

export default TrendArrow