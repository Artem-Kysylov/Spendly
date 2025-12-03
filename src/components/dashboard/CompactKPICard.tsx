import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Pencil } from 'lucide-react'
import { formatCurrency } from '@/lib/chartUtils'
import TrendArrow from '@/components/ui-elements/TrendArrow'
import BudgetProgressBar from '@/components/ui-elements/BudgetProgressBar'

interface CompactKPICardProps {
    budget: number
    totalExpenses: number
    expensesTrend: number
    onBudgetClick: () => void
}

export default function CompactKPICard({
    budget,
    totalExpenses,
    expensesTrend,
    onBudgetClick,
}: CompactKPICardProps) {
    const tDashboard = useTranslations('dashboard')
    const tBudgets = useTranslations('budgets')

    const { safeToSpend, daysLeft } = useMemo(() => {
        const today = new Date()
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        const daysLeft = Math.max(1, endOfMonth.getDate() - today.getDate())
        const remaining = budget - totalExpenses
        const safeToSpend = remaining / daysLeft
        return { safeToSpend, daysLeft }
    }, [budget, totalExpenses])

    const remainingBudget = budget - totalExpenses

    return (
        <div className="kpi-scroll--hidden min-w-0 flex flex-row overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 gap-4 pb-2 md:pb-0">
            {/* Card 1: Total Budget */}
            <div className="min-w-[74vw] md:min-w-0 snap-center bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[140px] relative group">
                <button
                    type="button"
                    className="absolute top-3 right-3 cursor-pointer opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={onBudgetClick}
                    aria-label={tBudgets('actions.edit') ?? 'Edit budget'}
                >
                    <Pencil className="text-muted-foreground w-4 h-4 hover:text-primary" />
                </button>

                <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                        {tDashboard('counters.totalBudget')}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground">
                            {formatCurrency(budget)}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <BudgetProgressBar
                        spentAmount={totalExpenses}
                        totalAmount={budget}
                        type="expense"
                        className="h-2"
                        showLabels={false}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                            {formatCurrency(totalExpenses)} {tBudgets('labels.spent')}
                        </span>
                        <span>
                            {formatCurrency(remainingBudget)} {tBudgets('labels.left')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card 2: Total Expenses */}
            <div className="min-w-[74vw] md:min-w-0 snap-center bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[140px]">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                        {tDashboard('counters.totalExpenses')}
                    </h3>
                    <div className="mt-2">
                        <span className="text-2xl font-bold text-foreground">
                            {formatCurrency(totalExpenses)}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <TrendArrow trend={expensesTrend} variant="expense" />
                </div>
            </div>

            {/* Card 3: Daily Safe-to-Spend */}
            <div className="min-w-[74vw] md:min-w-0 snap-center bg-card border border-border rounded-xl p-4 flex flex-col justify-between h-[140px]">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                        {tDashboard('counters.dailySafeToSpend')}
                    </h3>
                    <div className="mt-2">
                        <span className={`text-2xl font-bold ${safeToSpend < 0 ? 'text-red-500' : 'text-foreground'}`}>
                            {formatCurrency(safeToSpend)}
                        </span>
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">
                    {daysLeft} days left in month
                </div>
            </div>

            <style>{`
                .kpi-scroll--hidden { scrollbar-width: none; }
                .kpi-scroll--hidden::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    )
}