import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'

// Import components
import { Progress } from '../ui/progress'

// Import types 
import { BudgetFolderItemProps } from '../../types/types'

const BudgetFolderItem = ({ id, emoji, name, amount }: BudgetFolderItemProps) => {
  const { session } = UserAuth()
  const [spentAmount, setSpentAmount] = useState(0)

  const fetchSpentAmount = async () => {
    if (!session?.user?.id || !id) return

    try {
      const { data, error } = await supabase
        .from('budget_folder_transactions')
        .select('amount')
        .eq('budget_folder_id', id)
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error fetching spent amount:', error)
        return
      }

      const total = data?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0
      setSpentAmount(total)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchSpentAmount()
  }, [id, session?.user?.id])

  const progressPercentage = amount > 0 ? (spentAmount / amount) * 100 : 0

  return (
    <div className='flex flex-col items-center justify-center gap-[8px] border border-light-grey rounded-lg w-[335px] min-w-[335px] h-[200px] transition-opacity duration-300 hover:opacity-50'>
        <span className='text-[25px]'>{emoji}</span>
        <h3 className='text-secondary-black text-[16px] font-semibold'>{name}</h3>
        <p className='text-secondary-black text-[25px] font-semibold'>${amount}</p>
        <div className="w-[280px] flex flex-col gap-1">
          <Progress 
            value={spentAmount} 
            max={amount} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-secondary-black/70">
            <span>${spentAmount.toFixed(2)} spent</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
        </div>
    </div>
  )
}

export default BudgetFolderItem