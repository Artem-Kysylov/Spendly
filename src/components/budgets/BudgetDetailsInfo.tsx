import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'

// Import components
import BudgetProgressBar from '../ui-elements/BudgetProgressBar'

// Import types 
import { BudgetDetailsProps } from '../../types/types'

function BudgetDetailsInfo({ id, emoji, name, amount, type }: BudgetDetailsProps) {
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
    <motion.div 
      className='flex flex-col items-center justify-center gap-[8px] border border-border rounded-lg h-full bg-card p-[20px] w-full max-w-full overflow-hidden'
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.span 
        className='text-[24px] sm:text-[25px]'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      >
        {emoji}
      </motion.span>
      <motion.h1 
        className='text-secondary-black dark:text-white text-[20px] sm:text-[22px] md:text-[25px] font-semibold break-words text-center'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
      >
        {name}
      </motion.h1>
      <motion.p 
        className='text-secondary-black dark:text-white text-[20px] sm:text-[22px] md:text-[25px] font-semibold break-words text-center'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
      >
        ${amount}
      </motion.p>
      
      <motion.div 
        className="w-full mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
      >
        <BudgetProgressBar 
          spentAmount={spentAmount}
          totalAmount={amount}
          type={type}
        />
      </motion.div>
    </motion.div>
  )
}

export default BudgetDetailsInfo