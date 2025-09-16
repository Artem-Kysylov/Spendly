'use client';
// Imports 
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

// Import hooks 
import useModal from '../../hooks/useModal'

// Import components 
import Button from '../../components/ui-elements/Button'
import Spinner from '../../components/ui-elements/Spinner'
import TransactionsTable from '../../components/chunks/TransactionsTable'
import EmptyState from '../../components/chunks/EmptyState'
import TransactionModal from '../../components/modals/TransactionModal'
import ToastMessage from '../../components/ui-elements/ToastMessage'

// Import types
import { Transaction, ToastMessageProps } from '../../types/types'

const Transactions = () => {
  // States 
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)

  // Import hooks 
  const { isModalOpen, openModal, closeModal } = useModal()

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase.from('Transactions').select('*')
      
      if (error) {
        console.error('Error fetching transactions:', error)
        return
      }
      
      setTransactions(data as Transaction[])
    } catch (error) {
      console.error('Unexpected error:', error)
    } finally {
      setTimeout(() => setIsLoading(false), 500)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const handleTransactionSubmit = (message: string, type: ToastMessageProps['type']) => {
    handleToastMessage(message, type)
    if (type === 'success') {
      setTimeout(() => {
        fetchTransactions()
      }, 1000)
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from('Transactions').delete().eq('id', id)
      
      if (error) {
        console.error('Error deleting transaction:', error)
        handleToastMessage('Error deleting transaction', 'error')
        return
      }
      
      handleToastMessage('Transaction deleted successfully', 'success')
      // Pause before deleting data from the table
      setTimeout(() => {
        fetchTransactions()
      }, 1000)
    } catch (error) {
      console.error('Unexpected error during deletion:', error)
      handleToastMessage('An unexpected error occurred', 'error')
    }
  }

  return (
    <div>
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}
      <div className="flex flex-col items-center gap-5 text-center mt-[30px] px-5 md:flex-row md:justify-between md:text-left">
        <h1 className="text-[35px] font-semibold text-secondary-black">
          Transactions 📉
        </h1>
        <Button
          className='btn-primary text-white'
          text='Add Transaction'
          onClick={openModal}
        />
      </div>

      {isModalOpen && (
        <TransactionModal
          title="Add Transaction"
          onClose={() => {
            closeModal()
            handleToastMessage('Transaction cancelled', 'error')
          }}
          onSubmit={(message, type) => {
            handleTransactionSubmit(message, type)
          }}
        />
      )}

      {isLoading ? (
        <Spinner />
      ) : transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className='mt-[30px] px-5'>
          <TransactionsTable 
            transactions={transactions} 
            onDeleteTransaction={handleDeleteTransaction}
            deleteModalConfig={{
              title: "Delete transaction",
              text: "Are you sure you want to delete this transaction?"
            }}
          />
        </div>
      )}
    </div>
  )
}

export default Transactions