import { Transaction } from '@/types/types'
import MobileTransactionCard from '@/components/chunks/MobileTransactionCard'
import Button from '@/components/ui-elements/Button'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface RecentTransactionsListProps {
    transactions: Transaction[]
    onEdit: (t: Transaction) => void
    onDelete: (id: string) => void
}

export default function RecentTransactionsList({ transactions, onEdit, onDelete }: RecentTransactionsListProps) {
    const router = useRouter()
    const tDashboard = useTranslations('dashboard')
    const tTransactions = useTranslations('transactions')

    const recent = transactions.slice(0, 5)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{tDashboard('recentActivity')}</h3>
                <Button
                    text={tDashboard('showAll')}
                    variant="ghost"
                    onClick={() => router.push('/transactions')}
                    className="text-primary hover:text-primary/80"
                />
            </div>
            <div className="space-y-3">
                {recent.map(t => (
                    <MobileTransactionCard
                        key={t.id}
                        transaction={t}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        showDate={true}
                    />
                ))}
                {recent.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">{tTransactions('table.empty.default')}</p>
                )}
            </div>
        </div>
    )
}
