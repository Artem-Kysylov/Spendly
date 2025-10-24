'use client'

import { useEffect, useState } from 'react'
import { UserAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

import TransactionsTable from '@/components/chunks/TransactionsTable'
import EmptyState from '@/components/chunks/EmptyState'
import Counters from '@/components/chunks/Counters'
import Spinner from '@/components/ui-elements/Spinner'
import MainBudgetModal from '@/components/modals/MainBudgetModal'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import { ChartsContainer } from '@/components/charts/ChartsContainer'
import Button from '@/components/ui-elements/Button'
import TransactionModal from '@/components/modals/TransactionModal'
import { Plus } from 'lucide-react'

import useModal from '@/hooks/useModal'
import useCheckBudget from '@/hooks/useCheckBudget'

import { ToastMessageProps, Transaction } from '@/types/types'
import type { EditTransactionPayload } from '@/types/types'

const DashboardClient = () => {
  const { session } = UserAuth()
  const router = useRouter()  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const [refreshCounters, setRefreshCounters] = useState<number>(0) 
  const { isModalOpen, openModal, closeModal } = useModal()
  const { isModalOpen: isAddOpen, openModal: openAddModal, closeModal: closeAddModal } = useModal()

  const tDashboard = useTranslations('dashboard')
  const tTransactions = useTranslations('transactions')
  const tCommon = useTranslations('common')

  const { isLoading: isBudgetChecking } = useCheckBudget(session?.user?.id)

  const fetchTransactions = async () => {
    if (!session?.user?.id) return
    
    setIsLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        budget_folders (
          emoji,
          name
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching transactions:', error)
    }

    const transformedData = (data ?? []).map(transaction => ({
      ...transaction,
      category_emoji: transaction.budget_folders?.emoji || null,
      category_name: transaction.budget_folders?.name || null,
    }))

    setTransactions(transformedData as Transaction[])
    setTimeout(() => setIsLoading(false), 500)
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchTransactions()
    }
  }, [session?.user?.id])

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const handleTransactionSubmit = (message: string, type: ToastMessageProps['type']) => {
    handleToastMessage(message, type)
    if (type === 'success') {
      setRefreshCounters(prev => prev + 1)
      setTimeout(() => {
        fetchTransactions()
      }, 1000)
    }
  }

  const handleIconClick = () => {
    openModal()
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      
      if (error) {
        console.error('Error deleting transaction:', error)
        handleToastMessage(tTransactions('toast.deleteFailed'), 'error')
        return
      }
      handleToastMessage(tTransactions('toast.deleteSuccess'), 'success')
      setTimeout(() => {
        fetchTransactions()
        setRefreshCounters(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Unexpected error during deletion:', error)
      handleToastMessage(tCommon('unexpectedError'), 'error')
    }
  }

  const handleEditTransaction = async (payload: EditTransactionPayload) => {
    if (!session?.user?.id) return
    try {
      const updateData: any = {
        title: payload.title,
        amount: payload.amount,
        type: payload.type,
        budget_folder_id: payload.budget_folder_id ?? null,
      }
      
      if (payload.created_at) {
        updateData.created_at = payload.created_at
      }

      const { error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', payload.id)
        .eq('user_id', session.user.id)
        .select('*')

      if (error) {
        console.error('Error updating transaction:', error)
        handleToastMessage(tTransactions('toast.updateFailed'), 'error')
        return
      }
      handleToastMessage(tTransactions('toast.updateSuccess'), 'success')
      await fetchTransactions()
      setRefreshCounters(prev => prev + 1) 
      window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
    } catch (e) {
      console.error('Unexpected error during update:', e)
      handleToastMessage(tCommon('unexpectedError'), 'error')
    }
  }

  return (
    <div>
      {(isLoading || isBudgetChecking) ? (
        <Spinner />
      ) : (
        <>
          {toastMessage && (
            <ToastMessage text={toastMessage.text} type={toastMessage.type} />
          )}
          <motion.div
            className="flex flex-col items-center gap-5 text-center mt-[30px] px-5 md:flex-row md:justify-between md:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.h1 
              className="text-[26px] sm:text-[32px] md:text-[35px] font-semibold text-secondary-black"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              {tDashboard('welcome', { name: session?.user?.user_metadata?.name ?? '' })}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            >
              <Button
                text={tTransactions('addTransaction')}
                variant="primary"
                onClick={openAddModal}
                icon={<Plus size={16} className="text-white" />}
              />
            </motion.div>
          </motion.div>

          <motion.div
            style={{ willChange: 'opacity' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28 }}
            className="mt-[30px] px-5 flex flex-col gap-5"
          >
            <Counters onIconClick={handleIconClick} refreshTrigger={refreshCounters} />

            <motion.div
              style={{ willChange: 'opacity' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.28 }}
              className="mt-8"
            >
              <ChartsContainer showFilters={true} currency="USD" />
            </motion.div>

            {isLoading ? (
              <Spinner />
            ) : transactions.length === 0 ? (
              <EmptyState
                title={tTransactions('empty.title')}
                description={tTransactions('empty.description')}
                buttonText={tTransactions('addTransaction')}
                onButtonClick={() => router.push('/transactions')}
              />
            ) : (
              <motion.div
                style={{ willChange: 'opacity' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.28 }}
                className="mt-8"
              >
                <TransactionsTable 
                  transactions={transactions} 
                  onDeleteTransaction={handleDeleteTransaction}
                  deleteModalConfig={{ 
                    title: tDashboard('deleteModal.title'), 
                    text: tDashboard('deleteModal.prompt') 
                  }}
                  onEditTransaction={handleEditTransaction}
                />
              </motion.div>
            )}
          </motion.div>

          {isModalOpen && (
            <MainBudgetModal
              title={tDashboard('mainBudget.editTitle')}
              onSubmit={handleTransactionSubmit}
              onClose={closeModal}
            />
          )}
          {isAddOpen && (
            <TransactionModal
              title={tTransactions('modal.addTitle')}
              onClose={closeAddModal}
              onSubmit={(message, type) => {
                handleTransactionSubmit(message, type)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

export default DashboardClient