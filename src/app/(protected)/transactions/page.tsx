'use client';

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'

// Import hooks
import useModal from '@/hooks/useModal'

// Import components
import Button from '@/components/ui-elements/Button'
import Spinner from '@/components/ui-elements/Spinner'
import TransactionsTable from '@/components/chunks/TransactionsTable'
import EmptyState from '@/components/chunks/EmptyState'
import TransactionModal from '@/components/modals/TransactionModal'
import ToastMessage from '@/components/ui-elements/ToastMessage'

// Import types
import { Transaction, ToastMessageProps } from '@/types/types'
import type { EditTransactionPayload } from '@/types/types'

// Component
const Transactions = () => {
  const { session } = UserAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const { isModalOpen, openModal, closeModal } = useModal()

  useEffect(() => {
    if (session?.user?.id) {
      fetchTransactions()
    }
  }, [session?.user?.id])

  const fetchTransactions = async () => {
    if (!session?.user?.id) return

    try {
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
        return
      }

      // Transform data to include category info
      const transformedData = data?.map(transaction => ({
        ...transaction,
        category_emoji: transaction.budget_folders?.emoji || null,
        category_name: transaction.budget_folders?.name || null
      })) || []

      setTransactions(transformedData)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const handleTransactionSubmit = (message: string, type: ToastMessageProps['type']) => {
    handleToastMessage(message, type)
    fetchTransactions()
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!session?.user?.id) return

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error deleting transaction:', error)
        handleToastMessage('Error deleting transaction', 'error')
        return
      }

      handleToastMessage('Transaction deleted successfully', 'success')
      fetchTransactions()
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage('An unexpected error occurred', 'error')
    }
  }

  // Обработчик редактирования: апдейт в БД + рефетч + тост
  const handleEditTransaction = async (payload: EditTransactionPayload) => {
    if (!session?.user?.id) return
    try {
      const updateData: any = {
        title: payload.title,
        amount: payload.amount,
        type: payload.type,
        budget_folder_id: payload.budget_folder_id ?? null,
      }
      
      // Добавляем created_at только если он передан
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
        handleToastMessage('Failed to update transaction', 'error')
        return
      }

      handleToastMessage('Transaction updated successfully!', 'success')
      await fetchTransactions()
      // Обновим прогресс бары бюджетов, если открыты соответствующие виджеты
      window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
    } catch (e) {
      console.error('Unexpected error during update:', e)
      handleToastMessage('An unexpected error occurred', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6 px-5">
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}
      
      <div className="flex items-center justify-between mt-[30px] md:flex-row md:justify-between md:text-left">
        <h1 className="text-[35px] font-semibold text-secondary-black">Transactions📉</h1>
        <Button
          text="Add Transaction"
          variant="primary"
          onClick={openModal}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Start by adding your first transaction"
          buttonText="Add Transaction"
          onButtonClick={openModal}
        />
      ) : (
        <TransactionsTable
          transactions={transactions}
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