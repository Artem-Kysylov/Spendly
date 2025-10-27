import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'
import BudgetProgressBar from '../ui-elements/BudgetProgressBar'
import type { BudgetFolderItemProps } from '../../types/types'
import { useTranslations } from 'next-intl'

const BudgetFolderItem = ({ id, emoji, name, amount, type }: BudgetFolderItemProps) => {
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

      const total =
        (data?.reduce((sum: number, tx: { amount: number; type: string }) => (tx.type === 'expense' ? sum + tx.amount : sum), 0)) || 0
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
    <div className="flex flex-col items-center justify-center gap-[8px] border border-border rounded-lg w/full sm:w-[335px] h-[200px] bg-card transition-opacity duration-300 hover:opacity-50 p-4">
      <span className="text-[28px]">{emoji}</span>
      <h3 className="text-foreground text-[16px] font-semibold">{name}</h3>
      <p className="text-foreground text-[18px] font-semibold">${amount}</p>
      <div className="w-full mt-3">
        <BudgetProgressBar
          spentAmount={spentAmount}
          totalAmount={amount}
          type={type}
          spentLabel={tBudgets('labels.spent')}
          leftLabel={tBudgets('labels.left')}
        />
      </div>
    </div>
  )
}

export default BudgetFolderItem