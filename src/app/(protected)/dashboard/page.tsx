'use client'

// Imports 
import { useEffect, useState } from 'react'
import { UserAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

// Import components 
import Button from '@/components/ui-elements/Button'
import TransactionsTable from '@/components/chunks/TransactionsTable'
import EmptyState from '@/components/chunks/EmptyState'
import Counters from '@/components/chunks/Counters'
import Spinner from '@/components/ui-elements/Spinner'
import MainBudgetModal from '@/components/modals/MainBudgetModal'
import ToastMessage from '@/components/ui-elements/ToastMessage'

// Import hooks 
import useModal from '@/hooks/useModal'
import useCheckBudget from '@/hooks/useCheckBudget'

// Import types
import { ToastMessageProps, Transaction } from '@/types/types'
import type { EditTransactionPayload } from '@/types/types'

// Component: Dashboard
const Dashboard = () => {
  const { session } = UserAuth()
  const router = useRouter()  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const [refreshCounters, setRefreshCounters] = useState<number>(0) 
  const { isModalOpen, openModal, closeModal } = useModal()

  // Проверяем наличие бюджета
  const { isLoading: isBudgetChecking } = useCheckBudget(session?.user?.id)

  const fetchTransactions = async () => {
    if (!session?.user?.id) return
    
    setIsLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
    
    setTransactions(data as Transaction[])
    setTimeout(() => setIsLoading(false), 500)
    if (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  useEffect(() => {
    if (session?.user?.id) {
      fetchTransactions()
    }
  }, [session?.user?.id]) // Добавляем зависимость от user_id

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const handleTransactionSubmit = (message: string, type: ToastMessageProps['type']) => {
    handleToastMessage(message, type)
    if (type === 'success') {
      // Обновляем счетчики после успешного обновления бюджета
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
        handleToastMessage('Error deleting transaction', 'error')
        return
      }
      
      handleToastMessage('Transaction deleted successfully', 'success')
      // Pause before deleting data from the table
      setTimeout(() => {
        fetchTransactions()
        setRefreshCounters(prev => prev + 1) // Обновляем счетчики
      }, 1000)
    } catch (error) {
      console.error('Unexpected error during deletion:', error)
      handleToastMessage('An unexpected error occurred', 'error')
    }
  }

  // Обработчик редактирования для Dashboard
  const handleEditTransaction = async (payload: EditTransactionPayload) => {
    if (!session?.user?.id) return
    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          title: payload.title,
          amount: payload.amount,
          type: payload.type,
          budget_folder_id: payload.budget_folder_id ?? null,
        })
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
      setRefreshCounters(prev => prev + 1) // обновим счетчики
      window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
    } catch (e) {
      console.error('Unexpected error during update:', e)
      handleToastMessage('An unexpected error occurred', 'error')
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
          <div className="flex flex-col items-center gap-5 text-center mt-[30px] px-5 md:flex-row md:justify-between md:text-left">
            <h1 className="text-[35px] font-semibold text-secondary-black">
              Welcome <span className="text-primary">{session?.user?.user_metadata?.name}✌️</span>
            </h1>
            <Button
              variant="primary"
              text="Add Transaction"
              onClick={() => router.push('/transactions')}
            />
          </div>
          <div className="mt-[30px] px-5 flex flex-col gap-5">
            <Counters onIconClick={handleIconClick} refreshTrigger={refreshCounters} />
            {isLoading ? (
              <Spinner />
            ) : transactions.length === 0 ? (
              <EmptyState 
                title="Don`t have any transactions yet?"
                description="Create new by clicking this button"
                buttonText="Add Transaction"
                onButtonClick={() => router.push('/transactions')}
              />
            ) : (
              <TransactionsTable 
                transactions={transactions} 
                onDeleteTransaction={handleDeleteTransaction}
                deleteModalConfig={{
                  title: "Delete transaction",
                  text: "Are you sure you want to delete this transaction?"
                }}
                onEditTransaction={handleEditTransaction}
              />
            )}
          </div>
          {isModalOpen && <MainBudgetModal title="Edit main budget" onSubmit={handleTransactionSubmit} onClose={closeModal} />}
        </>
      )}
    </div>
  )
}

export default Dashboard