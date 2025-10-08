import React from 'react'
import { Brain, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIInsightsProps {
  totalExpenses: number
  totalIncome: number
  budget: number
  netBalance: number
  expensesTrend: number
  incomeTrend: number
  className?: string
}

const AIInsights = ({ 
  totalExpenses, 
  totalIncome, 
  budget, 
  netBalance, 
  expensesTrend, 
  incomeTrend,
  className 
}: AIInsightsProps) => {
  // Заглушка для AI-анализа - в будущем здесь будет реальная AI логика
  const generateInsights = () => {
    const insights = []
    
    // Анализ бюджета
    if (budget > 0) {
      const budgetUsage = (totalExpenses / budget) * 100
      if (budgetUsage > 100) {
        insights.push({
          type: 'warning' as const,
          icon: AlertTriangle,
          title: 'Budget Exceeded',
          message: `You've exceeded your budget by $${(totalExpenses - budget).toFixed(2)}. Consider reviewing your spending.`
        })
      } else if (budgetUsage > 80) {
        insights.push({
          type: 'warning' as const,
          icon: AlertTriangle,
          title: 'Budget Alert',
          message: `You've used ${budgetUsage.toFixed(1)}% of your budget. Monitor your spending carefully.`
        })
      }
    }
    
    // Анализ трендов
    if (expensesTrend > 20) {
      insights.push({
        type: 'warning' as const,
        icon: TrendingUp,
        title: 'Rising Expenses',
        message: `Your expenses increased by ${expensesTrend.toFixed(1)}% compared to last month.`
      })
    }
    
    if (incomeTrend > 10) {
      insights.push({
        type: 'positive' as const,
        icon: TrendingUp,
        title: 'Income Growth',
        message: `Great! Your income increased by ${incomeTrend.toFixed(1)}% from last month.`
      })
    }
    
    // Анализ баланса
    if (netBalance < 0) {
      insights.push({
        type: 'warning' as const,
        icon: AlertTriangle,
        title: 'Negative Cash Flow',
        message: 'Your expenses exceed your income this month. Consider reducing spending or increasing income.'
      })
    }
    
    // Если нет предупреждений, добавляем позитивный инсайт
    if (insights.length === 0) {
      insights.push({
        type: 'positive' as const,
        icon: Lightbulb,
        title: 'Financial Health',
        message: 'Your finances look stable this month. Keep up the good work!'
      })
    }
    
    return insights.slice(0, 2) // Показываем максимум 2 инсайта
  }

  const insights = generateInsights()

  if (insights.length === 0) return null

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-4">
        <Brain className="w-5 h-5 text-purple-600" />
        <h3 className="text-sm font-medium text-black dark:text-white">AI Insights</h3>
        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">Beta</span>
      </div>
      
      {insights.map((insight, index) => {
        const Icon = insight.icon
        return (
          <div 
            key={index}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border",
              insight.type === 'warning' 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-green-50 border-green-200'
            )}
          >
            <Icon className={cn(
              "w-4 h-4 mt-0.5 flex-shrink-0",
              insight.type === 'warning' ? 'text-yellow-600' : 'text-green-600'
            )} />
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "text-sm font-medium",
                insight.type === 'warning' ? 'text-yellow-800' : 'text-green-800'
              )}>
                {insight.title}
              </h4>
              <p className={cn(
                "text-xs mt-1",
                insight.type === 'warning' ? 'text-yellow-700' : 'text-green-700'
              )}>
                {insight.message}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default AIInsights