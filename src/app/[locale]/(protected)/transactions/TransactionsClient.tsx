'use client';

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import useModal from '@/hooks/useModal'
import { useTransactionsData } from '@/hooks/useTransactionsData'
import Button from '@/components/ui-elements/Button'
import Spinner from '@/components/ui-elements/Spinner'
import TransactionsTable from '@/components/chunks/TransactionsTable'
import MobileTransactionsList from '@/components/chunks/MobileTransactionsList'
import EmptyState from '@/components/chunks/EmptyState'
import TransactionModal from '@/components/modals/TransactionModal'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import TransactionsFilter from '@/components/ui-elements/TransactionsFilter'
import { ExpensesBarChart } from '@/components/charts/TransactionsBarChart'
import { ToastMessageProps } from '@/types/types'
import type { EditTransactionPayload } from '@/types/types'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import { useTranslations } from 'next-intl'

export default function TransactionsClient() {
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const { isModalOpen, openModal, closeModal } = useModal()

  const {
    allTransactions,
    filteredTransactions,
    chartData,
    isLoading,
    isChartLoading,
    error,
    refetch,
    updateFilters,
    filters
  } = useTransactionsData()

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleTransactionSubmit = (message: string, type: ToastMessageProps['type']) => {
    handleToastMessage(message, type)
    if (type === 'success') {
      setTimeout(() => {
        refetch()
      }, 1000)
    }
  }

  const { session } = UserAuth()
  const t = useTranslations('transactions')
  const tCommon = useTranslations('common')

  const handleDeleteTransaction = async (id: string) => {
    if (!session?.user?.id || !id) return

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error deleting transaction:', error)
        handleToastMessage(t('toast.deleteFailed'), 'error')
        return
      }
      handleToastMessage(t('toast.deleteSuccess'), 'success')
      setTimeout(() => {
        refetch()
      }, 1000)
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage(tCommon('unexpectedError'), 'error')
    }
  }

  const handleEditTransaction = async (payload: EditTransactionPayload) => {
    try {
      await refetch()
      handleToastMessage(t('toast.updateSuccess'), 'success')
      window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
    } catch (e) {
      console.error('Unexpected error during update:', e)
      handleToastMessage(tCommon('unexpectedError'), 'error')
    }
  }

  const handleFiltersChange = (newFilters: { transactionType?: string; datePeriod?: string }) => {
    const updates: any = {}
    if (newFilters.transactionType) updates.dataType = newFilters.transactionType
    if (newFilters.datePeriod) updates.period = newFilters.datePeriod
    updateFilters(updates)
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 px-5">
        <div className="flex items-center justify-center mt-[30px]">
          <div className="text-destructive">{tCommon('errorLabel')}: {String(error)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-5">
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}

      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.9 }}
        style={{ willChange: 'transform' }}
        className="flex itemscenter justify-between mt-[30px] md:flex-row md:justify-between md:text-left"
      >
        <h1 className="text-[26px] sm:text-[32px] md:text-[35px] font-semibold text-secondary-black">
          {t('title')}
        </h1>
        <Button
          text={t('addTransaction')}
          variant="primary"
          onClick={openModal}
          icon={<Plus size={16} className="text-white" />}
        />
      </motion.div>

      <motion.div layout style={{ willChange: 'transform' }}>
        <TransactionsFilter
          transactionType={filters.dataType}
          onTransactionTypeChange={(type) => handleFiltersChange({ transactionType: type })}
          datePeriod={filters.period}
          onDatePeriodChange={(period) => handleFiltersChange({ datePeriod: period })}
          className="mb-4"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
      >
        <ExpensesBarChart
          data={chartData}
          filters={filters}
          isLoading={isChartLoading}
          currency="USD"
          height={240}
          className="w-full mb-6"
        />
      </motion.div>

      {isLoading ? (
        <Spinner />
      ) : filteredTransactions.length === 0 && allTransactions.length > 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('empty.filtered')}</p>
        </div>
      ) : allTransactions.length === 0 ? (
        <EmptyState
          title={t('empty.title')}
          description={t('empty.description')}
          buttonText={t('addTransaction')}
          onButtonClick={openModal}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.5 }}
        >
          <div className="block md:hidden">
            <MobileTransactionsList
              transactions={filteredTransactions}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleEditTransaction}
            />
          </div>
          <div className="hidden md:block">
            <TransactionsTable
              transactions={filteredTransactions}
              onDeleteTransaction={handleDeleteTransaction}
              onEditTransaction={handleEditTransaction}
            />
          </div>
        </motion.div>
      )}

      {isModalOpen && (
        <TransactionModal
          title={t('modal.addTitle')}
          onClose={closeModal}
          onSubmit={(message, type) => {
            handleTransactionSubmit(message, type)
          }}
        />
      )}
    </div>
  )
}