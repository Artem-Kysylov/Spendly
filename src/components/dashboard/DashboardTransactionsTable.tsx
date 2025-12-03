import { useState } from 'react'
import { Trash, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'

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
import MobileTransactionCard from '@/components/chunks/MobileTransactionCard'

// Import types
import type { Transaction } from '@/types/types'

interface DashboardTransactionsTableProps {
    transactions: Transaction[]
    onEdit: (transaction: Transaction) => void
    onDelete: (id: string) => void
}

export default function DashboardTransactionsTable({
    transactions,
    onEdit,
    onDelete
}: DashboardTransactionsTableProps) {
    const router = useRouter()
    const tDashboard = useTranslations('dashboard')
    const tTransactions = useTranslations('transactions')

    // Показываем только 5 последних транзакций
    const recentTransactions = transactions.slice(0, 5)

    if (transactions.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">{tTransactions('table.empty.default')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4 mb-24 min-w-0">
            {/* Header with title and Show All button */}
            <div className="flex items-center justify-between min-w-0">
                <h3 className="font-semibold text-lg">{tDashboard('recentActivity')}</h3>
                <Button
                    variant="ghost"
                    onClick={() => router.push('/transactions')}
                    className="text-primary hover:text-primary/80"
                >
                    {tDashboard('showAll')}
                </Button>
            </div>

            {/* Mobile version - cards */}
            <div className="block md:hidden space-y-3 min-w-0 overflow-x-hidden">
                {recentTransactions.map(transaction => (
                    <MobileTransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        showDate={true}
                    />
                ))}
            </div>

            {/* Desktop version - table */}
            <div className="hidden md:block w-full overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                <Table className="w-full">
                    <TableHeader className="border-b border-border">
                        <TableRow>
                            <TableHead className="!text-[16px] font-semibold text-foreground">
                                {tTransactions('table.headers.title')}
                            </TableHead>
                            <TableHead className="!text-[16px] font-semibold text-foreground">
                                {tTransactions('table.headers.budget')}
                            </TableHead>
                            <TableHead className="!text-[16px] font-semibold text-foreground">
                                {tTransactions('table.headers.amount')}
                            </TableHead>
                            <TableHead className="!text-[16px] font-semibold text-foreground">
                                {tTransactions('table.headers.type')}
                            </TableHead>
                            <TableHead className="!text-[16px] font-semibold text-foreground">
                                {tTransactions('table.headers.date')}
                            </TableHead>
                            <TableHead className="!text-[16px] font-semibold text-foreground">
                                {tTransactions('table.headers.actions')}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentTransactions.map((transaction) => (
                            <TableRow
                                key={transaction.id}
                                className="border-b border-border hover:bg-muted/30"
                            >
                                <TableCell className="text-foreground">{transaction.title}</TableCell>
                                <TableCell className="text-foreground">
                                    {transaction.category_emoji && transaction.category_name ? (
                                        <span className="flex items-center gap-1">
                                            <span>{transaction.category_emoji}</span>
                                            <span>{transaction.category_name}</span>
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground italic">
                                            {tTransactions('table.unbudgeted')}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-foreground">${transaction.amount}</TableCell>
                                <TableCell>
                                    <span
                                        className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide border ${transaction.type === 'expense'
                                            ? 'border-red-500 text-red-500 bg-transparent'
                                            : 'border-green-500 text-green-500 bg-transparent'
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
                                            onClick={() => onEdit(transaction)}
                                        >
                                            <Pencil size={16} />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-error hover:bg-red-50"
                                            onClick={() => onDelete(transaction.id)}
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
        </div>
    )
}