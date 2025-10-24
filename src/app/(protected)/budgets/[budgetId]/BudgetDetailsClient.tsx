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

  if (isLoading) {
    return <Spinner />
  }

  return (
    <div className="px-5 mt-[30px] space-y-6">
      {toastMessage && <ToastMessage text={toastMessage.text} type={toastMessage.type} />}

      <BudgetDetailsInfo details={budgetDetails} />
      <BudgetDetailsControls
        onDelete={openDeleteModal}
        onEdit={openEditModal}
      />
      <BudgetDetailsForm
        isSubmitting={isSubmitting}
        onSubmit={handleTransactionSubmit}
      />

      <TransactionsTable
        transactions={transactions}
        onDeleteTransaction={() => {}}
        onEditTransaction={(payload: EditTransactionPayload) => {
          console.log('Edit payload', payload)
        }}
      />

      {isDeleteModalOpen && (
        <DeleteModal
          title={tBudgets('details.modal.deleteTitle')}
          onClose={closeDeleteModal}
          onDelete={handleDeleteBudget}
          loading={isDeleting}
        />
      )}

      {isEditModalOpen && (
        <BudgetModal
          title={tBudgets('details.modal.editTitle')}
          defaultEmoji={budgetDetails.emoji}
          defaultName={budgetDetails.name}
          defaultAmount={budgetDetails.amount}
          onClose={closeEditModal}
          onSubmit={handleUpdateBudget}
          handleToastMessage={handleToastMessage}
        />
      )}
    </div>
  )
}