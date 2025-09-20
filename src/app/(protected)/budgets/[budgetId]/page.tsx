'use client'

// Imports 
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'

// Import hooks
import useModal from '@/hooks/useModal'

// Components 
import BudgetDetailsInfo from '@/components/budgets/BudgetDetailsInfo'
import BudgetDetailsForm from '@/components/budgets/BudgetDetailsForm'
import BudgetDetailsControls from '@/components/budgets/BudgetDetailsControls'
import Spinner from '@/components/ui-elements/Spinner'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import DeleteModal from '@/components/modals/DeleteModal'
import BudgetModal from '@/components/modals/BudgetModal'
import TransactionsTable from '@/components/chunks/TransactionsTable'

// Import types
import { BudgetDetailsProps, Transaction, ToastMessageProps } from '@/types/types'
import type { EditTransactionPayload } from '@/types/types'

// Component: BudgetDetails
const BudgetDetails = () => {
  const { budgetId } = useParams<{ budgetId: string }>()
  const id = budgetId

  const router = useRouter()

  const { session } = UserAuth()
  
  // States 
  const { isModalOpen: isDeleteModalOpen, openModal: openDeleteModal, closeModal: closeDeleteModal } = useModal()
  const { isModalOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } = useModal()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(null)
  const [budgetDetails, setBudgetDetails] = useState<BudgetDetailsProps>({
    emoji: '😊',
    name: 'Loading...',
    amount: 0,
    type: 'expense'
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  const fetchBudgetType = async () => {
    if (!session?.user?.id || !id) return

    try {
      console.log('Fetching budget type for id:', id)
      const { data, error } = await supabase
        .from('budget_folders')
        .select('type')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching budget type:', error)
        return
      }

      if (data) {
        console.log('Received budget data:', data)
      } else {
        console.log('No budget data received')
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleTransactionSubmit = async (title: string, amount: string) => {
    if (!session?.user?.id || !id) return

    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_folders')
        .select('type')
        .eq('id', id)
        .single()

      if (budgetError) {
        console.error('Error fetching budget type:', budgetError)
        handleToastMessage('Failed to determine budget type', 'error')
        return
      }

      if (!budgetData?.type) {
        console.error('Budget type is missing')
        handleToastMessage('Budget type is missing', 'error')
        return
      }

      console.log('Creating transaction for budget:', {
        budgetId: id,
        budgetType: budgetData.type
      })

      setIsSubmitting(true)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          budget_folder_id: id,
          user_id: session.user.id,
          title,
          amount: Number(amount),
          type: budgetData.type
        })
        .select()

      if (transactionError) {
        console.error('Error creating transaction:', transactionError)
        handleToastMessage('Failed to add transaction. Please try again.', 'error')
        return
      }

      handleToastMessage('Transaction added successfully!', 'success')
      fetchTransactions()
      // Trigger refresh of budget folder items to update progress bars
      window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage('An unexpected error occurred', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBudget = async () => {
    if (!session?.user?.id || !id) return

    try {
      setIsDeleting(true)
      const { error } = await supabase
        .from('budget_folders')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error deleting budget:', error)
        handleToastMessage('Failed to delete budget. Please try again.', 'error')
        return
      }

      handleToastMessage('Budget deleted successfully!', 'success')
      setTimeout(() => {
        router.push('/budgets')
      }, 2000)
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage('An unexpected error occurred', 'error')
    } finally {
      setIsDeleting(false)
      closeDeleteModal()
    }
  }

  const handleUpdateBudget = async (emoji: string, name: string, amount: number) => {
    if (!session?.user?.id || !id) return

    try {
      setIsSubmitting(true)
      const { error } = await supabase
        .from('budget_folders')
        .update({ emoji, name, amount })
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error updating budget:', error)
        handleToastMessage('Failed to update budget. Please try again.', 'error')
        return
      }

      handleToastMessage('Budget updated successfully!', 'success')
      closeEditModal()
      fetchBudgetDetails()
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage('An unexpected error occurred', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchBudgetDetails = async () => {
    if (!session?.user?.id || !id) return

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('budget_folders')
        .select('emoji, name, amount, type')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()

      if (error) {
        console.error('Error fetching budget details:', error)
        return
      }

      if (data) {
        setBudgetDetails(data as BudgetDetailsProps)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTransactions = async () => {
    if (!session?.user?.id || !id) return

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
        .eq('budget_folder_id', id)
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

      console.log('Fetched transactions:', transformedData)
      setTransactions(transformedData)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchBudgetType()
    fetchBudgetDetails()
    fetchTransactions()
  }, [id, session?.user?.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner />
      </div>
    )
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!session?.user?.id || !id) return

    try {
      setIsDeleting(true)
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

      handleToastMessage('Transaction deleted successfully!', 'success')
      fetchTransactions()
      fetchBudgetDetails()
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage('An unexpected error occurred', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // Update transaction (Edit)
  const handleUpdateTransaction = async ({ id, title, amount, type, budget_folder_id }: EditTransactionPayload) => {
    if (!session?.user?.id || !id) return
  
    try {
      console.log('[BudgetDetails] Updating transaction:', { id, title, amount, type, budget_folder_id })
      const { data, error } = await supabase
        .from('transactions')
        .update({
          title,
          amount,
          type,
          budget_folder_id: budget_folder_id ?? null,
        })
        .eq('id', id)
        .eq('user_id', session.user.id)
        .select('*')
  
      if (error) {
        console.error('Error updating transaction:', error)
        handleToastMessage('Failed to update transaction', 'error')
        return
      }
  
      console.log('[BudgetDetails] Update OK. Updated rows:', data)
      handleToastMessage('Transaction updated successfully!', 'success')
      await fetchTransactions()
      await fetchBudgetDetails()
      window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
    } catch (err) {
      console.error('Error:', err)
      handleToastMessage('An unexpected error occurred', 'error')
    }
  }

  return (
    <div className='mt-[30px] px-5'>
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}
      <BudgetDetailsControls 
        onDeleteClick={openDeleteModal}
        onEditClick={openEditModal}
      />
      <div className='flex items-start justify-between gap-[20px] mb-[30px]'>
        <BudgetDetailsInfo 
          emoji={budgetDetails.emoji}
          name={budgetDetails.name}
          amount={budgetDetails.amount}
          type={budgetDetails.type}
        />
        <BudgetDetailsForm 
          onSubmit={handleTransactionSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      {transactions.length > 0 && (
        <TransactionsTable 
          transactions={transactions}
          onDeleteTransaction={handleDeleteTransaction}
          onEditTransaction={handleUpdateTransaction}
          allowTypeChange={false}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteModal
          title="Delete Budget"
          text="Are you sure you want to delete this budget?"
          onClose={closeDeleteModal}
          onConfirm={handleDeleteBudget}
          isLoading={isDeleting}
        />
      )}
      {isEditModalOpen && (
        <BudgetModal
          title="Edit Budget"
          onClose={closeEditModal}
          onSubmit={handleUpdateBudget}
          isLoading={isSubmitting}
          initialData={budgetDetails}
        />
      )}

    </div>
  )
}

export default BudgetDetails