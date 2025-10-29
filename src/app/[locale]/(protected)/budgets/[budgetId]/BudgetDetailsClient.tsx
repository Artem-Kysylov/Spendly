'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import useModal from '@/hooks/useModal'
import BudgetDetailsInfo from '@/components/budgets/BudgetDetailsInfo'
import BudgetDetailsForm from '@/components/budgets/BudgetDetailsForm'
import BudgetDetailsControls from '@/components/budgets/BudgetDetailsControls'
import Spinner from '@/components/ui-elements/Spinner'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import DeleteModal from '@/components/modals/DeleteModal'
import BudgetModal from '@/components/modals/BudgetModal'
import TransactionsTable from '@/components/chunks/TransactionsTable'
import { BudgetDetailsProps, Transaction, ToastMessageProps } from '@/types/types'
import type { EditTransactionPayload } from '@/types/types'
import { useTranslations } from 'next-intl'

export default function BudgetDetailsClient() {
  const { budgetId } = useParams<{ budgetId: string }>()
  const id = budgetId
  const router = useRouter()
  const { session } = UserAuth()

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

  const tBudgets = useTranslations('budgets')
  const tCommon = useTranslations('common')

  const handleToastMessage = (text: string, type: ToastMessageProps['type']) => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3000)
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
      if (data) setBudgetDetails(data as BudgetDetailsProps)
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
        .select(`*, budget_folders (emoji, name)`)
        .eq('budget_folder_id', id)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error fetching transactions:', error)
        return
      }
      const transformedData = data?.map(transaction => ({
        ...transaction,
        category_emoji: transaction.budget_folders?.emoji || null,
        category_name: transaction.budget_folders?.name || null
      })) || []
      setTransactions(transformedData)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchBudgetDetails()
    fetchTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, id])

  const handleTransactionSubmit = async (title: string, amount: string, date: Date) => {
    if (!session?.user?.id || !id) return
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budget_folders')
        .select('type')
        .eq('id', id)
        .single()
      if (budgetError || !budgetData?.type) {
        handleToastMessage(tBudgets('details.toast.failedDetermineType'), 'error')
        return
      }
      setIsSubmitting(true)
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          budget_folder_id: id,
          user_id: session.user.id,
          title,
          amount: Number(amount),
          type: budgetData.type,
          created_at: date.toISOString()
        })
        .select()
      if (transactionError) {
        handleToastMessage(tBudgets('details.toast.addFailed'), 'error')
        return
      }
      handleToastMessage(tBudgets('details.toast.addSuccess'), 'success')
      fetchTransactions()
      window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage(tCommon('unexpectedError'), 'error')
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
        handleToastMessage(tBudgets('details.toast.deleteFailed'), 'error')
        return
      }
      handleToastMessage(tBudgets('details.toast.deleteSuccess'), 'success')
      setTimeout(() => {
        router.push('/budgets')
      }, 2000)
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage(tCommon('unexpectedError'), 'error')
    } finally {
      setIsDeleting(false)
      closeDeleteModal()
    }
  }

  const handleUpdateBudget = async (
    emoji: string,
    name: string,
    amount: number,
    type: 'expense' | 'income'
  ) => {
    if (!session?.user?.id || !id) return
    try {
      setIsSubmitting(true)
      const { error } = await supabase
        .from('budget_folders')
        .update({ emoji, name, amount, type })
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) {
        handleToastMessage(tBudgets('details.toast.updateFailed'), 'error')
        return
      }

      handleToastMessage(tBudgets('details.toast.updateSuccess'), 'success')
      closeEditModal()
      fetchBudgetDetails()
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage(tCommon('unexpectedError'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!session?.user?.id || !transactionId) return
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error deleting transaction:', error)
        handleToastMessage(tCommon('unexpectedError'), 'error')
        return
      }

      handleToastMessage(tBudgets('details.toast.deleteSuccess'), 'success')
      await fetchTransactions()
    } catch (error) {
      console.error('Error:', error)
      handleToastMessage(tCommon('unexpectedError'), 'error')
    }
  }

  const handleEditTransaction = async (payload: EditTransactionPayload) => {
    if (!session?.user?.id || !payload?.id) return
    try {
      const updates: Partial<EditTransactionPayload> & { created_at?: string } = {
        title: payload.title,
        amount: payload.amount,
        type: payload.type
      }
      if (payload.budget_folder_id !== undefined) {
        updates.budget_folder_id = payload.budget_folder_id
      }
      if (payload.created_at) {
        updates.created_at = payload.created_at
      }

      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', payload.id)
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error updating transaction:', error)
        handleToastMessage(tCommon('unexpectedError'), 'error')
        return
      }

      handleToastMessage(tBudgets('details.toast.updateSuccess'), 'success')
      await fetchTransactions()
      window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
    } catch (error) {
      console.error('Unexpected error during update:', error)
      handleToastMessage(tCommon('unexpectedError'), 'error')
    }
  }

  if (isLoading) {
    return <Spinner />
  }

  return (
    <div className="px-5 mt-[30px] space-y-6">
      {toastMessage && <ToastMessage text={toastMessage.text} type={toastMessage.type} />}


      <BudgetDetailsControls
        onDeleteClick={openDeleteModal}
        onEditClick={openEditModal}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <BudgetDetailsInfo
          id={id}
          emoji={budgetDetails.emoji}
          name={budgetDetails.name}
          amount={budgetDetails.amount}
          type={budgetDetails.type}
        />
        <BudgetDetailsForm
          isSubmitting={isSubmitting}
          onSubmit={handleTransactionSubmit}
        />
      </div>

      <TransactionsTable
        transactions={transactions}
        onDeleteTransaction={handleDeleteTransaction}
        onEditTransaction={handleEditTransaction}
      />

      {isDeleteModalOpen && (
        <DeleteModal
          title={tBudgets('details.deleteModal.title')}
          text={tBudgets('details.deleteModal.text')}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteBudget}
          isLoading={isDeleting}
        />
      )}

      {isEditModalOpen && (
        <BudgetModal
          title={tBudgets('details.editModal.title')}
          initialData={{
            emoji: budgetDetails.emoji,
            name: budgetDetails.name,
            amount: budgetDetails.amount,
            type: budgetDetails.type,
          }}
          onClose={closeEditModal}
          onSubmit={handleUpdateBudget}
          isLoading={isSubmitting}
          handleToastMessage={handleToastMessage}
        />
      )}
    </div>
  )
}