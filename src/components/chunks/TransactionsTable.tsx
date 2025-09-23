// Imports 
import { useState } from 'react'
import { Trash, Pencil } from 'lucide-react'

// Import shadcn components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Import components 
import Button from '../ui-elements/Button'
import DeleteModal from '../modals/DeleteModal'
import EditTransactionModal from '../modals/EditTransactionModal'

// Import types
import { TransactionsTableProps } from '../../types/types'
import type { Transaction, EditTransactionPayload } from '../../types/types'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'

const TransactionsTable = ({ 
  transactions, 
  onDeleteTransaction,
  deleteModalConfig = {
    title: "Delete transaction",
    text: "Are you sure you want to delete this transaction?"
  },
  onEditTransaction,
  allowTypeChange = true
}: TransactionsTableProps) => {
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)

  const { session } = UserAuth()

  // Sort transactions 
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const handleOpenModal = (id: string) => {
    setSelectedTransactionId(id)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTransactionId(null)
  }

  const handleConfirmDelete = async () => {
    if (selectedTransactionId) {
      await onDeleteTransaction(selectedTransactionId)
      handleCloseModal()
    }
  }

  const updateTransactionDirect = async (payload: EditTransactionPayload) => {
    if (!session?.user?.id) throw new Error('No session user id')
    console.log('[TransactionsTable] Fallback update:', payload)
    
    const updateData: any = {
      title: payload.title,
      amount: payload.amount,
      type: payload.type,
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

    if (error) {
      console.error('[TransactionsTable] Fallback update error:', error)
      throw error
    }
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto rounded-[10px] border border-light-grey bg-background">
        <Table>
          <TableHeader className="border-b border-light-grey">
            <TableRow className="border-b border-light-grey hover:bg-transparent">
              <TableHead className="!text-[16px] font-semibold text-secondary-black">#</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Transaction Name</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Category</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Amount(USD)</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Type</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Date</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Edit</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((transaction, index) => (
              <TableRow key={transaction.id} className="border-b border-light-grey hover:bg-gray-50/50">
                <TableCell className="font-medium text-secondary-black">{index + 1}</TableCell>
                <TableCell className="text-secondary-black">{transaction.title}</TableCell>
                <TableCell className="text-secondary-black">
                  {transaction.category_emoji && transaction.category_name ? (
                    <span className="flex items-center gap-1">
                      <span>{transaction.category_emoji}</span>
                      <span>{transaction.category_name}</span>
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">Uncategorized</span>
                  )}
                </TableCell>
                <TableCell className="text-secondary-black">{transaction.amount}</TableCell>
                <TableCell>
                  <span
                    className={`${transaction.type === 'expense' ? 'text-error' : 'text-success'} text-[14px]`}
                  >
                    {transaction.type}
                  </span>
                </TableCell>
                <TableCell className="text-secondary-black">
                  {new Date(transaction.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    icon={<Pencil size={16} />}
                    text="Edit"
                    className="p-0 text-primary"
                    variant="ghost"
                    onClick={() => {
                      setEditingTransaction(transaction)
                      setIsEditOpen(true)
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    icon={<Trash size={16} />}
                    text="Delete"
                    className="p-0 text-error"
                    variant="ghost"
                    onClick={() => {
                      setSelectedTransactionId(transaction.id)
                      setIsModalOpen(true)
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete modal */}
      {isModalOpen && selectedTransactionId && (
        <DeleteModal
          title={deleteModalConfig.title}
          text={deleteModalConfig.text}
          onClose={() => setIsModalOpen(false)}
          onConfirm={() => {
            if (selectedTransactionId) {
              onDeleteTransaction(selectedTransactionId)
                .finally(() => setIsModalOpen(false))
            }
          }}
        />
      )}

      {/* Edit modal */}
      {isEditOpen && editingTransaction && (
        <EditTransactionModal
          title="Edit transaction"
          onClose={() => {
            setIsEditOpen(false)
            setEditingTransaction(null)
          }}
          isLoading={isEditing}
          initialData={{
            id: editingTransaction.id,
            title: editingTransaction.title,
            amount: editingTransaction.amount,
            type: editingTransaction.type,
            budget_folder_id: editingTransaction.budget_folder_id ?? null,
            created_at: editingTransaction.created_at,
          }}
          allowTypeChange={allowTypeChange}
          onSubmit={async (payload) => {
            try {
              setIsEditing(true)
              console.log('[TransactionsTable] Submitting edit payload:', payload)
              if (onEditTransaction) {
                await onEditTransaction(payload)
              } else {
                await updateTransactionDirect(payload)
                window.dispatchEvent(new CustomEvent('budgetTransactionAdded'))
              }
              setIsEditOpen(false)
              setEditingTransaction(null)
            } catch (e) {
              console.error('[TransactionsTable] Edit submit failed:', e)
            } finally {
              setIsEditing(false)
            }
          }}
        />
      )}
    </div>
  )
}

export default TransactionsTable