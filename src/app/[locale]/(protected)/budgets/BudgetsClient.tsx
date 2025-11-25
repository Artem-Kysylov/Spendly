'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import { Link } from '@/i18n/routing'
import { useBudgets } from '@/hooks/useBudgets'
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
import useDeviceType from '@/hooks/useDeviceType'
import { useTransactionsData } from '@/hooks/useTransactionsData'
import BudgetComparisonChart from '@/components/budgets/BudgetComparisonChart'

export default function BudgetsClient() {
  const { session } = UserAuth()
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const [budgetFolders, setBudgetFolders] = useState<BudgetFolderItemProps[]>([])
  const { isModalOpen, openModal, closeModal } = useModal()
  const tBudgets = useTranslations('budgets')
  const tCommon = useTranslations('common')
  const { subscriptionPlan } = useSubscription()
  const [showUpgrade, setShowUpgrade] = useState(false)

  // Тип устройства и состояние ховера для графика
  const { isDesktop } = useDeviceType()
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Транзакции для расчета потраченного по бюджетам
  const { allTransactions, isLoading: isTransactionsLoading } = useTransactionsData({
    period: 'Month',
    dataType: 'Expenses',
  })

  const spentByBudget = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const t of allTransactions) {
      if (t.type === 'expense' && t.budget_folder_id) {
        acc[t.budget_folder_id] = (acc[t.budget_folder_id] || 0) + t.amount
      }
    }
    return acc
  }, [allTransactions])

  // Синхронизация папок бюджета с хуком
  const { budgets, isLoading: isBudgetsLoading, refetch } = useBudgets()
  useEffect(() => {
    setBudgetFolders(budgets)
  }, [budgets])

  // Лимит для Free плана (например, 3 бюджета)
  const isLimitReached = subscriptionPlan === 'free' && budgetFolders.length >= 3

  // Тосты
  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Ограничение показа апгрейд‑попапа
  const canShowUpgradePopup = () => {
    try {
      const count = parseInt(window.localStorage.getItem('spendly:upgrade_popup_count') || '0', 10)
      return count < 3
    } catch {
      return true
    }
  }

  const markUpgradePopupShown = () => {
    try {
      const count = parseInt(window.localStorage.getItem('spendly:upgrade_popup_count') || '0', 10)
      window.localStorage.setItem('spendly:upgrade_popup_count', String(count + 1))
    } catch {
      // no-op
    }
  }

  // Создание новой папки бюджета (используется в модалке)
  const handleBudgetSubmit = async (
    emoji: string,
    name: string,
    amount: number,
    type: 'expense' | 'income',
    color_code?: string | null
  ): Promise<void> => {
    if (!session?.user?.id) {
      throw new Error('Not authenticated')
    }
    try {
      const { error } = await supabase
        .from('budget_folders')
        .insert({
          user_id: session.user.id,
          emoji,
          name,
          amount,
          type,
          color_code: color_code ?? null,
        })
        .select()

      if (error) {
        throw error
      }

      handleToastMessage(tBudgets('list.toast.createSuccess'), 'success')
      await refetch()
    } catch (err) {
      console.error('Error creating budget folder:', err)
      handleToastMessage(tCommon('unexpectedError'), 'error')
      throw err
    }
  }

  // Данные для сравнительного графика
  const chartData = useMemo(() => {
    return budgetFolders.map((folder) => ({
      category: folder.emoji ? `${folder.emoji} ${folder.name}` : folder.name,
      amount: spentByBudget[folder.id] || 0,
      // цвет бара = цвет бюджета, иначе primary
      fill: folder.color_code ? `#${folder.color_code}` : 'hsl(var(--primary))',
      emoji: folder.emoji,
    }))
  }, [budgetFolders, spentByBudget])

  return (
    <div className='mt-[30px] px-5 pb-20'>
      {toastMessage && <ToastMessage text={toastMessage.text} type={toastMessage.type} />}
      {showUpgrade && <UpgradeCornerPanel />}

      {/* Аналитика: мобильная — скрываема; десктоп — всегда видна */}
      <motion.div
        style={{ willChange: 'opacity' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28 }}
        className='mb-6'
      >
        {isDesktop ? (
          <BudgetComparisonChart
            data={chartData}
            isLoading={isTransactionsLoading}
            onBarHover={(idx) => setHoveredIndex(idx)}
            onBarLeave={() => setHoveredIndex(null)}
          />
        ) : (
          <div className="space-y-3">
            <button
              className="w-full px-4 py-3 rounded-md bg-muted hover:bg-muted/80 transition-colors flex items-center justify-between"
              onClick={() => setIsAnalyticsOpen((v) => !v)}
            >
              <span className="text-sm font-medium flex items-center gap-2">
                <span aria-hidden>📊</span>
                {isAnalyticsOpen ? 'Hide Analytics' : 'Show Analytics'}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`h-5 w-5 text-muted-foreground transition-transform ${isAnalyticsOpen ? 'rotate-180' : 'rotate-0'}`}
              >
                <path d="M12 15.5a1 1 0 0 1-.71-.29l-5.5-5.5a1 1 0 1 1 1.42-1.42L12 12.38l4.79-4.79a1 1 0 0 1 1.42 1.42l-5.5 5.5a1 1 0 0 1-.71.29z"/>
              </svg>
            </button>
            {isAnalyticsOpen && (
              <BudgetComparisonChart
                data={chartData}
                isLoading={isTransactionsLoading}
                onBarHover={(idx) => isDesktop && setHoveredIndex(idx)}
                onBarLeave={() => setHoveredIndex(null)}
                className="w-full"
              />
            )}
          </div>
        )}
      </motion.div>

      {/* Кнопка создания бюджета — на мобиле остаётся отдельным полноширинным блоком */}
      {!isDesktop && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ willChange: 'opacity, transform' }}
          className='w-full mb-5'
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
      )}

      {/* Карточки бюджетов: на десктопе 4 в ряд, первой идёт кнопка создания */}
      <motion.div
        style={{ willChange: 'opacity' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28 }}
        className='grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6'
      >
        {isDesktop && (
          <motion.div
            style={{ willChange: 'opacity, transform' }}
            className='w-full cursor-pointer'
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
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
        )}

        {budgetFolders.map((folder, index) => (
          <motion.div 
            key={folder.id} 
            style={{ willChange: 'opacity, transform' }} 
            className={`w-full cursor-pointer ${hoveredIndex === index ? 'ring-2 ring-primary/80 bg-primary/5 scale-[1.01] transition' : ''}`}
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