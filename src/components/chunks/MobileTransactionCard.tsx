// /Users/macbookair/Documents/projects/spendly-app-ver-1.0/src/components/chunks/MobileTransactionCard.tsx
'use client'

import { Pencil, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/types/types'

type Props = {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (id: string) => void
}

export default function MobileTransactionCard({ transaction, onEdit, onDelete }: Props) {
  const amountClass =
    transaction.type === 'expense'
      ? 'text-error'
      : 'text-success'

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-lg">
            <span>{transaction.category_emoji || '🧾'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{transaction.title}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(transaction.created_at).toLocaleDateString()}
              {transaction.category_name ? ` • ${transaction.category_name}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`font-bold ${amountClass}`}>${transaction.amount}</div>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" aria-label="Edit" onClick={() => onEdit(transaction)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-error" aria-label="Delete" onClick={() => onDelete(transaction.id)}>
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
