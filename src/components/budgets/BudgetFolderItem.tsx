import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'
import BudgetProgressBar from '../ui-elements/BudgetProgressBar'
import type { BudgetFolderItemProps } from '../../types/types'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/chartUtils'

function BudgetFolderItem({ id, emoji, name, amount, type, color_code, rolloverPreviewCarry }: BudgetFolderItemProps) {
  const { session } = UserAuth()
  const [spentAmount, setSpentAmount] = useState(0)
  const tBudgets = useTranslations('budgets')

  const fetchSpentAmount = async () => {
    if (!session?.user?.id || !id) return
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('budget_folder_id', id)
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error fetching spent amount:', error)
        return
      }

      // Суммируем транзакции по типу бюджета
      const total =
        data?.reduce((sum: number, tx: { amount: number; type: string }) => {
          const matchesType = tx.type === (type === 'income' ? 'income' : 'expense')
          return matchesType ? sum + tx.amount : sum
        }, 0) || 0

      setSpentAmount(total)
    } catch (err) {
      console.error('Error:', err)
    }
  }

  useEffect(() => {
    fetchSpentAmount()
    const handleBudgetUpdate = () => fetchSpentAmount()
    window.addEventListener('budgetTransactionAdded', handleBudgetUpdate)
    return () => {
      window.removeEventListener('budgetTransactionAdded', handleBudgetUpdate)
    }
  }, [id, session?.user?.id])

  return (
    <div
      className="flex flex-col items-center justify-center gap-[8px] border border-border rounded-lg w-full h-[200px] bg-card transition-opacity duration-300 hover:opacity-50 p-3 md:p-4"
      style={{ backgroundColor: color_code ? `#${color_code}` : undefined }}
    >
      <span className="text-[28px]">{emoji}</span>
      <h3 className={`${color_code ? 'text-black dark:text-black' : 'text-foreground'} text-[16px] font-semibold text-center break-words leading-tight min-w-0`}>
        {name}
      </h3>
      {type === 'expense' && typeof rolloverPreviewCarry === 'number' && rolloverPreviewCarry !== 0 && (
        <div
          className={`px-2 py-1 rounded-md text-xs font-semibold ${
            rolloverPreviewCarry > 0 ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'
          }`}
        >
          {rolloverPreviewCarry > 0 ? 'Перенос ' : 'Перерасход '}
          {formatCurrency(Math.abs(rolloverPreviewCarry), 'USD')}
        </div>
      )}
      {/* Прогрессбар */}
      <div className="w-full mt-3">
        <BudgetProgressBar
          spentAmount={spentAmount}
          totalAmount={amount}
          type={type}
          spentLabel={tBudgets(type === 'income' ? 'labels.collected' : 'labels.spent')}
          leftLabel={tBudgets(type === 'income' ? 'labels.leftToGoal' : 'labels.left')}
          accentColorHex={color_code ?? undefined}
          compact
        />
      </div>
      {/* Сумма бюджета под прогрессбаром */}
      <p className={`${color_code ? 'text-black dark:text-black' : 'text-foreground'} text-[18px] font-semibold text-center leading-tight`}>
        ${amount}
      </p>
      {/* Суммы spent/left над текстовыми метками */}
      <div className={`${color_code ? 'text-black dark:text-black' : 'text-foreground'} grid grid-cols-2 text-xs w-full`}>
        <span className="font-semibold text-left justify-self-start">
          {formatCurrency(spentAmount, 'USD')}
        </span>
        <span className="font-semibold text-right justify-self-end">
          {formatCurrency(Math.max(amount - spentAmount, 0), 'USD')}
        </span>
      </div>
      {/* Текстовые метки */}
      <div className={`${color_code ? 'text-black dark:text-black' : 'text-gray-700 dark:text-white'} grid grid-cols-2 text-xs w-full`}>
        <span className="text-left justify-self-start">
          {tBudgets(type === 'income' ? 'labels.collected' : 'labels.spent')}
        </span>
        <span className="text-right justify-self-end">
          {tBudgets(type === 'income' ? 'labels.leftToGoal' : 'labels.left')}
        </span>
      </div>
    </div>
  )
}

export default BudgetFolderItem