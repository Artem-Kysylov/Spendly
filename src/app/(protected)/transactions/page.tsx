'use client';

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

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

// Component
const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const { isModalOpen, openModal, closeModal } = useModal()

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
        return
      }

      setTransactions(data || [])
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
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

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