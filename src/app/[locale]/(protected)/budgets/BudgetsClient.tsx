'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Link } from '@/i18n/routing'
import { useBudgets } from '@/hooks/useBudgets'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import useModal from '@/hooks/useModal'
import NewBudget from '@/components/budgets/AddNewBudget'
import NewBudgetModal from '@/components/modals/BudgetModal'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import BudgetFolderItem from '@/components/budgets/BudgetFolderItem'
import { ToastMessageProps, BudgetFolderItemProps } from '@/types/types'
import { useSubscription } from '@/hooks/useSubscription'
import UpgradeCornerPanel from '@/components/free/UpgradeCornerPanel'

export default function BudgetsClient() {
  const { session } = UserAuth()
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const [budgetFolders, setBudgetFolders] = useState<BudgetFolderItemProps[]>([])
  const { isModalOpen, openModal, closeModal } = useModal()
  const tBudgets = useTranslations('budgets')
  const tCommon = useTranslations('common')
  const { subscriptionPlan } = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)

  const isLimitReached = subscriptionPlan === 'free' && budgetFolders.length >= 3

  const canShowUpgradePopup = () => {
    try {
      const count = parseInt(window.localStorage.getItem('spendly:upgrade_popup_count') || '0', 10)
      return count < 3
    } catch { return true }
  }

  const markUpgradePopupShown = () => {
    try {
      const count = parseInt(window.localStorage.getItem('spendly:upgrade_popup_count') || '0', 10)
      window.localStorage.setItem('spendly:upgrade_popup_count', String(count + 1))
    } catch { /* no-op */ }
  }

  const fetchBudgetFolders = async () => {
    if (!session?.user?.id) return
    try {
      const { data, error } = await supabase
        .from('budget_folders')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching budget folders:', error)
        handleToastMessage(tBudgets('list.toast.failedLoad'), 'error')
        return
      }
      if (data) setBudgetFolders(data)
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage(tCommon('unexpectedError'), 'error')
    }
  }

  useEffect(() => {
    fetchBudgetFolders()
  }, [session?.user?.id])

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleBudgetSubmit = async (emoji: string, name: string, amount: number, type: 'expense' | 'income', color_code?: string | null) => {
    try {
      const { error } = await supabase
        .from('budget_folders')
        .insert({
          user_id: session?.user?.id,
          emoji,
          name,
          amount,
          type,
          color_code: color_code ?? null
        })

      if (error) {
        handleToastMessage(tBudgets('list.toast.failedCreate'), 'error')
        return
      }

      handleToastMessage(tBudgets('list.toast.createSuccess'), 'success')
      closeModal()
      // После успешного создания — триггерим момент delight на 3-м бюджете для Free
      const nextCount = budgetFolders.length + 1
      if (subscriptionPlan === 'free' && nextCount >= 3 && canShowUpgradePopup()) {
        setShowUpgrade(true)
        markUpgradePopupShown()
      }
      fetchBudgetFolders()
    } catch (error) {
      handleToastMessage(tCommon('unexpectedError'), 'error')
    }
  }

  return (
    <div className='mt-[30px] px-5'>
      {toastMessage && <ToastMessage text={toastMessage.text} type={toastMessage.type} />}
      {showUpgrade && <UpgradeCornerPanel />}

      <motion.div
        style={{ willChange: 'opacity' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28 }}
        className='flex items-center justify-start gap-[20px] flex-wrap'
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ willChange: 'opacity, transform' }}
        >
          <NewBudget
            onClick={() => {
              if (isLimitReached) {
                handleToastMessage(tBudgets('list.toast.limitReached'), 'error')
                if (canShowUpgradePopup()) {
                  setShowUpgrade(true)
                  markUpgradePopupShown()
                }
                return
              }
              openModal()
            }}
            disabled={isLimitReached}
          />
        </motion.div>

        {budgetFolders.map((folder, index) => (
          <motion.div 
            key={folder.id} 
            style={{ willChange: 'opacity, transform' }} 
            className='block w-full sm:w-[335px] cursor-pointer'
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 + (index * 0.1) }}
          >
            <Link href={{ pathname: '/budgets/[id]', params: { id: String(folder.id) } }}>
              <BudgetFolderItem 
                id={folder.id}
                emoji={folder.emoji}
                name={folder.name}
                amount={folder.amount}
                type={folder.type}
                color_code={folder.color_code ?? null}
              />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {isModalOpen && (
        <NewBudgetModal
          title={tBudgets('list.modal.createTitle')}
          onClose={closeModal}
          onSubmit={handleBudgetSubmit}
          handleToastMessage={handleToastMessage}
        />
      )}
    </div>
  )
}
