// /Users/macbookair/Documents/projects/spendly-app-ver-1.0/src/components/chunks/MobileTransactionsList.tsx
'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import MobileTransactionCard from './MobileTransactionCard'
import DeleteModal from '@/components/modals/DeleteModal'
import EditTransactionModal from '@/components/modals/EditTransactionModal'
import type { Transaction, EditTransactionPayload } from '@/types/types'
import { Pagination } from '@/components/ui/pagination'
import DateHeader from './DateHeader'
import { groupTransactionsByDate } from '@/lib/format/transactionsGrouping'

type Props = {
  transactions: Transaction[]
  onDeleteTransaction: (id: string) => Promise<void>
  onEditTransaction?: (payload: EditTransactionPayload) => Promise<void>
  allowTypeChange?: boolean
}

export default function MobileTransactionsList({ transactions, onDeleteTransaction, onEditTransaction, allowTypeChange = true }: Props) {
  const tTransactions = useTranslations('transactions')
  const { session } = UserAuth()

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const sorted = [...transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const pageSize = 10
  const totalPages = Math.ceil(sorted.length / pageSize) || 1
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pageItems = sorted.slice(startIndex, endIndex)

  // Группировка по датам (мобильная версия)
  const groups = groupTransactionsByDate(pageItems)

  // Фолбэк-апдейт, если не передан onEditTransaction
  const handleUpdateFallback = async (payload: EditTransactionPayload) => {
    const userId = session?.user?.id
    if (!userId) {
      throw new Error('No session user id')
    }

    const updateData: Record<string, unknown> = {
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
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  }

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => (
        <div key={group.date} className={gi === 0 ? 'space-y-1' : 'space-y-1 mt-4'}>
          <DateHeader date={group.date} />
          {group.items.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.05 }}
              className="mb-2"
            >
              <MobileTransactionCard
                transaction={t}
                onEdit={(tx) => { setSelectedTransaction(tx); setIsEditOpen(true) }}
                onDelete={(id) => {
                  const tx = pageItems.find(x => x.id === id) || null
                  setSelectedTransaction(tx)
                  setIsDeleteOpen(true)
                }}
              />
            </motion.div>
          ))}
        </div>
      ))}

      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />
      </div>

      {isDeleteOpen && selectedTransaction && (
        <DeleteModal
          title={tTransactions('table.modal.deleteTitle')}
          text={tTransactions('table.modal.deletePrompt')}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={async () => {
            await onDeleteTransaction(selectedTransaction.id)
            setIsDeleteOpen(false)
            setSelectedTransaction(null)
          }}
        />
      )}

      {isEditOpen && selectedTransaction && (
        <EditTransactionModal
          title={tTransactions('table.modal.editTitle')}
          onClose={() => { setIsEditOpen(false); setSelectedTransaction(null) }}
          isLoading={isEditing}
          initialData={{
            id: selectedTransaction.id,
            title: selectedTransaction.title,
            amount: selectedTransaction.amount,
            type: selectedTransaction.type,
            budget_folder_id: selectedTransaction.budget_folder_id ?? null,
            created_at: selectedTransaction.created_at,
          }}
          allowTypeChange={allowTypeChange}
          onSubmit={async (payload) => {
            try {
              setIsEditing(true)
              if (onEditTransaction) {
                await onEditTransaction(payload)
              } else {
                await handleUpdateFallback(payload)
                window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
              }
              setIsEditOpen(false)
              setSelectedTransaction(null)
            } finally {
              setIsEditing(false)
            }
          }}
        />
      )}
    </div>
  )
}