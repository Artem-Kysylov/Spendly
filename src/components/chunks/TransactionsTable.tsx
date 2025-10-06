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
import { Button } from "@/components/ui/button"
import DeleteModal from '../modals/DeleteModal'
import EditTransactionModal from '../modals/EditTransactionModal'

// Import types
import { TransactionsTableProps } from '../../types/types'
import type { Transaction, EditTransactionPayload } from '../../types/types'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'
import { Pagination } from '@/components/ui/pagination'

// Расширенный интерфейс для поддержки фильтрации
interface EnhancedTransactionsTableProps extends TransactionsTableProps {
  // Дополнительные опции для фильтрации и сортировки
  sortBy?: 'date' | 'amount' | 'title' | 'type'
  sortOrder?: 'asc' | 'desc'
  showFilters?: boolean
  emptyStateMessage?: string
  onTransactionUpdate?: () => void
}

const TransactionsTable = ({ 
  transactions, 
  onDeleteTransaction,
  deleteModalConfig = {
    title: "Delete transaction",
    text: "Are you sure you want to delete this transaction?"
  },
  onEditTransaction,
  allowTypeChange = true,
  // Новые пропсы
  sortBy = 'date',
  sortOrder = 'desc',
  showFilters = false,
  emptyStateMessage = "No transactions found",
  onTransactionUpdate
}: EnhancedTransactionsTableProps) => {
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)

  const { session } = UserAuth()

  // Пагинация
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 10

  // Улучшенная сортировка транзакций
  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        break
      case 'amount':
        comparison = a.amount - b.amount
        break
      case 'title':
        comparison = a.title.localeCompare(b.title)
        break
      case 'type':
        comparison = a.type.localeCompare(b.type)
        break
      default:
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    
    return sortOrder === 'desc' ? -comparison : comparison
  })

  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pageItems = sortedTransactions.slice(startIndex, endIndex)

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
      // Вызываем колбэк обновления если он есть
      onTransactionUpdate?.()
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

  // Если нет транзакций, показываем сообщение
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 mb-24">
        <p className="text-muted-foreground">{emptyStateMessage}</p>
      </div>
    )
  }

  return (
    <div className="relative mb-24">
      <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
        <Table>
          <TableHeader className="border-b border-border">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Transaction Name</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Budgets</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Amount</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Type</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Date</TableHead>
              <TableHead className="!text-[16px] font-semibold text-secondary-black">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((transaction, index) => (
              <TableRow key={transaction.id} className="border-b border-border hover:bg-gray-50/30">
                <TableCell className="text-secondary-black">{transaction.title}</TableCell>
                <TableCell className="text-secondary-black">
                  {transaction.category_emoji && transaction.category_name ? (
                    <span className="flex items-center gap-1">
                      <span>{transaction.category_emoji}</span>
                      <span>{transaction.category_name}</span>
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">Unbudgeted</span>
                  )}
                </TableCell>
                <TableCell className="text-secondary-black">${transaction.amount}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${
                      transaction.type === 'expense' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {transaction.type}
                  </span>
                </TableCell>
                <TableCell className="text-secondary-black">
                  {new Date(transaction.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-primary hover:bg-blue-50"
                      onClick={() => {
                        setEditingTransaction(transaction)
                        setIsEditOpen(true)
                      }}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-error hover:bg-red-50"
                      onClick={() => {
                        setSelectedTransactionId(transaction.id)
                        setIsModalOpen(true)
                      }}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Пагинация */}
      <div className="mt-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
        />
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
                .finally(() => {
                  setIsModalOpen(false)
                  onTransactionUpdate?.()
                })
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
              // Вызываем колбэк обновления если он есть
              onTransactionUpdate?.()
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