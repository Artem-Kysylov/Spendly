'use client';

import { useState } from 'react'
import { Plus } from 'lucide-react'

// Import hooks
import useModal from '@/hooks/useModal'
import { useTransactionsData } from '@/hooks/useTransactionsData'

// Import components
import Button from '@/components/ui-elements/Button'
import Spinner from '@/components/ui-elements/Spinner'
import TransactionsTable from '@/components/chunks/TransactionsTable'
import EmptyState from '@/components/chunks/EmptyState'
import TransactionModal from '@/components/modals/TransactionModal'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import TransactionsFilter from '@/components/ui-elements/TransactionsFilter'
import { ExpensesBarChart } from '@/components/charts/TransactionsBarChart'

// Import types
import { ToastMessageProps } from '@/types/types'
import type { EditTransactionPayload } from '@/types/types'

// Component
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'

const Transactions = () => {
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const { isModalOpen, openModal, closeModal } = useModal()

  // Используем новый хук для управления данными транзакций
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
        handleToastMessage('Failed to delete transaction. Please try again.', 'error')
        return
      }

      handleToastMessage('Transaction deleted successfully', 'success')
      setTimeout(() => {
        refetch()
      }, 1000)
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage('An unexpected error occurred', 'error')
    }
  }

  const handleEditTransaction = async (payload: EditTransactionPayload) => {
    try {
      // Логика редактирования будет обработана в хуке или здесь
      // Пока используем простой рефетч
      await refetch()
      handleToastMessage('Transaction updated successfully!', 'success')
      // Обновим прогресс бары бюджетов, если открыты соответствующие виджеты
      window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
    } catch (e) {
      console.error('Unexpected error during update:', e)
      handleToastMessage('An unexpected error occurred', 'error')
    }
  }

  // Обработчик изменения фильтров
  const handleFiltersChange = (newFilters: { transactionType?: string; datePeriod?: string }) => {
    const updates: any = {}
    
    if (newFilters.transactionType) {
      updates.dataType = newFilters.transactionType
    }
    
    if (newFilters.datePeriod) {
      updates.period = newFilters.datePeriod
    }
    
    updateFilters(updates)
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 px-5">
        <div className="flex items-center justify-center mt-[30px]">
          <div className="text-destructive">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-5">
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}
      
      <div className="flex items-center justify-between mt-[30px] md:flex-row md:justify-between md:text-left">
        <h1 className="text-[26px] sm:text-[32px] md:text-[35px] font-semibold text-secondary-black">Transactions📉</h1>
        <Button
          text="Add Transaction"
          variant="primary"
          onClick={openModal}
          icon={<Plus size={16} className="text-white" />}
        />
      </div>

      {/* Фильтр транзакций */}
      <TransactionsFilter
        transactionType={filters.dataType}
        onTransactionTypeChange={(type) => handleFiltersChange({ transactionType: type })}
        datePeriod={filters.period}
        onDatePeriodChange={(period) => handleFiltersChange({ datePeriod: period })}
        className="mb-4"
      />

      {/* Бар-чарт трат */}
      <ExpensesBarChart
        data={chartData}
        filters={filters}
        isLoading={isChartLoading}
        currency="USD"
        height={240}
        className="w-full mb-6"
      />

      {isLoading ? (
        <Spinner />
      ) : filteredTransactions.length === 0 && allTransactions.length > 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No transactions found for the selected filters</p>
        </div>
      ) : allTransactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Start by adding your first transaction"
          buttonText="Add Transaction"
          onButtonClick={openModal}
        />
      ) : (
        <TransactionsTable
          transactions={filteredTransactions}
          onDeleteTransaction={handleDeleteTransaction}
          onEditTransaction={handleEditTransaction}
        />
      )}

      {isModalOpen && (
        <TransactionModal
          title="Add Transaction"
          onClose={closeModal}
          onSubmit={(message, type) => {
            handleTransactionSubmit(message, type)
          }}
        />
      )}
    </div>
  )
}

export default Transactions