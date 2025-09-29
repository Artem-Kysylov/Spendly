'use client'

// Imports 
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient' 
import { UserAuth } from '../../context/AuthContext'
import { Pencil, Lightbulb } from 'lucide-react'

// Import Shadcn components
import { Card, CardContent } from '@/components/ui/card'

// Import components
import BudgetProgressBar from '../ui-elements/BudgetProgressBar'
import TrendArrow from '../ui-elements/TrendArrow'

// Import utilities
import { 
  calculatePercentageChange, 
  getPreviousMonthRange, 
  getCurrentMonthRange,
  calculateIncomeCoverage,
  formatMonthlyDifference,
  formatCurrency
} from '../../lib/chartUtils'

// Import types
import { Transaction } from '../../types/types'

// Component: TransactionsCounters
const TransactionsCounters = ({ 
  onIconClick, 
  refreshTrigger 
}: { 
  onIconClick: () => void
  refreshTrigger?: number 
}) => {
    const { session } = UserAuth()
    
    // Current month data
    const [totalExpenses, setTotalExpenses] = useState(0)
    const [totalIncome, setTotalIncome] = useState(0)
    const [budget, setBudget] = useState(0)
    
    // Previous month data for trends
    const [previousMonthExpenses, setPreviousMonthExpenses] = useState(0)
    const [previousMonthIncome, setPreviousMonthIncome] = useState(0)

    const fetchBudget = async () => {
        if (!session?.user?.id) return

        const { data, error } = await supabase
            .from('main_budget')
            .select('amount')
            .eq('user_id', session.user.id)
            .maybeSingle()

        if (error) {
            console.error('Error fetching budget:', error)
            return
        }

        setBudget(data?.amount ?? 0)
    }

    const fetchCurrentMonthTransactions = async () => {
        if (!session?.user?.id) return

        const { start, end } = getCurrentMonthRange()

        const { data, error } = await supabase
            .from('transactions')
            .select('type, amount')
            .eq('user_id', session.user.id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()) as { data: Transaction[] | null, error: any }

        if (error) {
            console.error('Error fetching current month transactions:', error)
            return
        }
      
        const expensesTotal = data?.filter(t => t.type === 'expense').reduce((total, t) => total + t.amount, 0) || 0
        const incomeTotal = data?.filter(t => t.type === 'income').reduce((total, t) => total + t.amount, 0) || 0

        setTotalExpenses(expensesTotal)
        setTotalIncome(incomeTotal)
    }

    const fetchPreviousMonthTransactions = async () => {
        if (!session?.user?.id) return

        const { start, end } = getPreviousMonthRange()

        const { data, error } = await supabase
            .from('transactions')
            .select('type, amount')
            .eq('user_id', session.user.id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()) as { data: Transaction[] | null, error: any }

        if (error) {
            console.error('Error fetching previous month transactions:', error)
            return
        }
      
        const expensesTotal = data?.filter(t => t.type === 'expense').reduce((total, t) => total + t.amount, 0) || 0
        const incomeTotal = data?.filter(t => t.type === 'income').reduce((total, t) => total + t.amount, 0) || 0

        setPreviousMonthExpenses(expensesTotal)
        setPreviousMonthIncome(incomeTotal)
    }

    // Memoized calculations
    const expensesTrend = useMemo(() => 
        calculatePercentageChange(totalExpenses, previousMonthExpenses), 
        [totalExpenses, previousMonthExpenses]
    )

    const incomeTrend = useMemo(() => 
        calculatePercentageChange(totalIncome, previousMonthIncome), 
        [totalIncome, previousMonthIncome]
    )

    const incomeCoverage = useMemo(() => 
        calculateIncomeCoverage(totalIncome, totalExpenses), 
        [totalIncome, totalExpenses]
    )

    const expensesDifference = useMemo(() => 
        formatMonthlyDifference(totalExpenses, previousMonthExpenses), 
        [totalExpenses, previousMonthExpenses]
    )

    const incomeDifference = useMemo(() => 
        formatMonthlyDifference(totalIncome, previousMonthIncome), 
        [totalIncome, previousMonthIncome]
    )

    // Budget calculations
    const budgetUsagePercentage = useMemo(() => 
        budget > 0 ? (totalExpenses / budget) * 100 : 0, 
        [totalExpenses, budget]
    )

    const remainingBudget = useMemo(() => 
        Math.max(budget - totalExpenses, 0), 
        [budget, totalExpenses]
    )

    const budgetStatus = useMemo(() => {
        if (budget === 0) return 'not-set'
        if (budgetUsagePercentage >= 100) return 'exceeded'
        if (budgetUsagePercentage >= 80) return 'warning'
        return 'good'
    }, [budget, budgetUsagePercentage])

    useEffect(() => {
        fetchBudget()
        fetchCurrentMonthTransactions()
        fetchPreviousMonthTransactions()
    }, [session?.user?.id, refreshTrigger]) 
    
    return (
        <div className="space-y-6">
            {/* Main Financial Overview Card */}
            <Card className="w-full">
                <CardContent className="pt-6">
                    {/* Three main counters in responsive grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Enhanced Budget Section */}
                        <div className="group relative">
                            <div className="absolute top-3 right-3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" onClick={onIconClick}>
                                <Pencil className="text-primary text-[18px] duration-300 hover:opacity-50"/>
                            </div>
                            
                            <div className="flex flex-col items-center justify-center gap-3 h-auto min-h-[140px] rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 hover:shadow-md transition-all duration-300">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm text-primary text-center font-medium">Total Budget</h3>
                                    {budgetStatus === 'exceeded' && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Exceeded</span>}
                                    {budgetStatus === 'warning' && <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full">Warning</span>}
                                    {budgetStatus === 'not-set' && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Not Set</span>}
                                </div>
                                
                                <span className={`text-[22px] font-bold text-center ${
                                    budgetStatus === 'exceeded' ? 'text-red-600' : 
                                    budgetStatus === 'warning' ? 'text-yellow-600' : 'text-primary'
                                }`}>
                                    {formatCurrency(budget)}
                                </span>
                                
                                {budget > 0 && (
                                    <>
                                        <div className="w-full max-w-[180px]">
                                            <BudgetProgressBar 
                                                spentAmount={totalExpenses}
                                                totalAmount={budget}
                                                type="expense"
                                                className="text-xs"
                                            />
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-xs text-gray-700 font-medium">
                                                {formatCurrency(remainingBudget)} remaining
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                {budgetUsagePercentage.toFixed(1)}% used
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Expenses Section */}
                        <div className="flex flex-col items-center justify-center gap-3 h-auto min-h-[140px] rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 p-4 hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm text-red-700 text-center font-medium">Total Expenses</h3>
                                {totalExpenses > budget && budget > 0 && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Over Budget</span>
                                )}
                            </div>
                            <span className="text-[22px] font-bold text-red-700 text-center">
                                {formatCurrency(totalExpenses)}
                            </span>
                            <TrendArrow trend={expensesTrend} variant="expense" />
                            <div className="text-center space-y-1">
                                <p className="text-xs text-gray-600">{expensesDifference}</p>
                                {budget > 0 && (
                                    <p className="text-xs text-gray-600">
                                        {((totalExpenses / budget) * 100).toFixed(1)}% of budget
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Income Section */}
                        <div className="flex flex-col items-center justify-center gap-3 h-auto min-h-[140px] rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 p-4 hover:shadow-md transition-all duration-300" 
                             style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                            <h3 className="text-sm text-green-700 text-center font-medium">Total Income</h3>
                            <span className="text-[22px] font-bold text-green-700 text-center">
                                {formatCurrency(totalIncome)}
                            </span>
                            <TrendArrow trend={incomeTrend} variant="income" />
                            <div className="text-center space-y-1">
                                <p className="text-xs text-gray-600">{incomeDifference}</p>
                                <p className="text-xs text-gray-600">
                                    Covers {incomeCoverage.toFixed(0)}% of expenses
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* AI Suggestions Placeholder inside the card */}
                    <div className="flex items-center gap-3 p-4 mt-6 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-gray-600 text-sm">💡 Here will be AI suggestions</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default TransactionsCounters