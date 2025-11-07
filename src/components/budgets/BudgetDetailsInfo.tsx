import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'
import { useTranslations } from 'next-intl'

// Import components
import BudgetProgressBar from '../ui-elements/BudgetProgressBar'

// Import types 
import { BudgetDetailsProps } from '../../types/types'
// Заменено: используем i18n‑роутер для App Router
import { useRouter } from '@/i18n/routing'

function BudgetDetailsInfo({ id, emoji, name, amount, type, color_code }: BudgetDetailsProps) {
  const { session } = UserAuth()
  const [spentAmount, setSpentAmount] = useState(0)
  const tBudgets = useTranslations('budgets')
  const tN = useTranslations('notifications')
  const router = useRouter()
  const percentage = amount > 0 ? (spentAmount / amount) * 100 : 0
  const bgColor = color_code ? `#${color_code}` : undefined

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

      // Суммируем по типу текущего бюджета (expense или income)
      const total =
        data?.reduce((sum, tx) => {
          const matchesType = tx.type === (type === 'income' ? 'income' : 'expense')
          return matchesType ? sum + tx.amount : sum
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
      className='flex flex-col items-center justify-center gap-[8px] border border-border rounded-lg min-h-[300px] h-full self-stretch bg-card p-[20px] w-full max-w-full overflow-hidden'
      style={{ backgroundColor: bgColor }}
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
        className={`${color_code ? 'text-black dark:text-black' : 'text-secondary-black dark:text-white'} text-[20px] sm:text-[22px] md:text-[25px] font-semibold break-words text-center`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
      >
        {name}
      </motion.h1>
      <motion.p 
        className={`${color_code ? 'text-black dark:text-black' : 'text-secondary-black dark:text-white'} text-[20px] sm:text-[22px] md:text-[25px] font-semibold break-words text-center`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
      >
        ${amount}
      </motion.p>

      {/* Inline warnings for expense budgets */}
      {type === 'expense' && percentage >= 80 && (
        <div className={`mt-3 p-3 rounded border ${percentage >= 100 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
          <div className="text-sm font-medium">
            {percentage >= 100 ? tN('budget_100') : tN('budget_80')}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => router.push('/transactions')}
              className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20"
            >
              {tBudgets('details.inlineWarning.reduceExpenses')}
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              {tBudgets('details.inlineWarning.openReport')}
            </button>
          </div>
        </div>
      )}

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
          spentLabel={tBudgets(type === 'income' ? 'labels.collected' : 'labels.spent')}
          leftLabel={tBudgets(type === 'income' ? 'labels.leftToGoal' : 'labels.left')}
          accentColorHex={color_code ?? undefined}
        />
      </motion.div>
    </motion.div>
  )
}

export default BudgetDetailsInfo