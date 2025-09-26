import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'

// Import components
import BudgetProgressBar from '../ui-elements/BudgetProgressBar'

// Import types 
import { BudgetDetailsProps } from '../../types/types'

const BudgetDetailsInfo = ({ id, emoji, name, amount, type }: BudgetDetailsProps) => {
  const { session } = UserAuth()
  const [spentAmount, setSpentAmount] = useState(0)

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

      // Calculate total spent amount (only expenses count towards budget spending)
      const total = data?.reduce((sum, transaction) => {
        return transaction.type === 'expense' ? sum + transaction.amount : sum
      }, 0) || 0
      
      setSpentAmount(total)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchSpentAmount()
    
    // Listen for budget transaction updates
    const handleBudgetUpdate = () => {
      fetchSpentAmount()
    }
    
    window.addEventListener('budgetTransactionAdded', handleBudgetUpdate)
    
    return () => {
      window.removeEventListener('budgetTransactionAdded', handleBudgetUpdate)
    }
  }, [id, session?.user?.id])

  return (
    <div className='flex flex-col items-center justify-center gap-[8px] border border-border rounded-lg h-full bg-white p-[20px]'>
      <span className='text-[25px]'>{emoji}</span>
      <h1 className='text-secondary-black text-[25px] font-semibold'>{name}</h1>
      <p className='text-secondary-black text-[25px] font-semibold'>${amount}</p>
      
      <div className="w-full mt-4">
        <BudgetProgressBar 
          spentAmount={spentAmount}
          totalAmount={amount}
          type={type}
        />
      </div>
    </div>
  )
}

export default BudgetDetailsInfo