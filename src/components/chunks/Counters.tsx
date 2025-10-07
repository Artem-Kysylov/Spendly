'use client'

// Imports 
import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient' 
import { UserAuth } from '../../context/AuthContext'
import { Pencil } from 'lucide-react'

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
import { useAISuggestions } from '@/hooks/useAISuggestions'
import { buildCountersPrompt } from '@/lib/ai/promptBuilders'
import { getLocalePreference, sanitizeTip, makeContextKey, getCachedTip, setCachedTip } from '@/lib/ai/tipUtils'
import Image from 'next/image'

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

    // Initialize AI suggestions hook
    const { text: tip, loading: tipLoading, error: tipError, isRateLimited, fetchSuggestion, abort } = useAISuggestions()

    // Local state for displaying tip (with cache and sanitization)
    const [displayTip, setDisplayTip] = useState<string>('')
    const [cooldownUntil, setCooldownUntil] = useState<number>(0)
    const lastKeyRef = useRef<string | null>(null)

    // Refresh AI tip based on current budget and expenses
    const refreshTip = () => {
      const now = Date.now()
      if (now < cooldownUntil) return
      setCooldownUntil(now + 4000) // anti-spam: 4 seconds

      // Edge case: no data at all
      const noData = budget === 0 && totalExpenses === 0 && totalIncome === 0
      if (noData) {
        setDisplayTip('Недостаточно данных для сравнения, попробуйте позже.')
        return
      }

      const locale = getLocalePreference()
      const prompt = buildCountersPrompt({
        budget,
        totalExpenses,
        totalIncome,
        previousMonthExpenses,
        previousMonthIncome,
        budgetUsagePercentage,
        remainingBudget,
        budgetStatus,
        expensesTrendPercent: expensesTrend,
        incomeTrendPercent: incomeTrend,
        incomeCoveragePercent: incomeCoverage,
        expensesDifferenceText: expensesDifference,
        incomeDifferenceText: incomeDifference,
        currency: 'USD',
        locale
      })

      const key = makeContextKey(prompt)
      lastKeyRef.current = key

      // Cache: if there is a fresh tip — show immediately and skip API call
      const cached = getCachedTip(key, 120000)
      if (cached) {
        setDisplayTip(sanitizeTip(cached))
        return
      }

      fetchSuggestion(prompt)
    }

    // When text comes from the hook — sanitize and put into cache
    useEffect(() => {
      if (!tip) return
      const clean = sanitizeTip(tip)
      setDisplayTip(clean)
      if (lastKeyRef.current) setCachedTip(lastKeyRef.current, clean)
    }, [tip])

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
                            
                            <div className="flex flex-col items-center justify-center gap-3 h-auto min-h-[140px] rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:bg-transparent dark:border dark:border-primary p-4 hover:shadow-md transition-all duration-300">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg text-primary text-center font-medium">Total Budget</h3>
                                    {budgetStatus === 'exceeded' && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Exceeded</span>}
                                    {budgetStatus === 'warning' && <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full">Warning</span>}
                                    {budgetStatus === 'not-set' && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Not Set</span>}
                                </div>
                                
                                <span className={`text-[30px] font-bold text-center ${
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
                                            <p className="text-xs text-gray-700 dark:text-white font-medium">
                                                {formatCurrency(remainingBudget)} remaining
                                            </p>
                                            <p className="text-xs text-gray-600 dark:text-white">
                                                {budgetUsagePercentage.toFixed(1)}% used
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Expenses Section */}
                        <div className="flex flex-col items-center justify-center gap-3 h-auto min-h-[140px] rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 dark:bg-transparent dark:border dark:border-red-500 p-4 hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg text-red-700 text-center font-medium">Total Expenses</h3>
                                {totalExpenses > budget && budget > 0 && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">Over Budget</span>
                                )}
                            </div>
                            <span className="text-[30px] font-bold text-red-700 text-center">
                                {formatCurrency(totalExpenses)}
                            </span>
                            <TrendArrow trend={expensesTrend} variant="expense" />
                            <div className="text-center space-y-1">
                                <p className="text-xs text-gray-600 dark:text-white">{expensesDifference}</p>
                                {budget > 0 && (
                                    <p className="text-xs text-gray-600 dark:text-white">
                                        {((totalExpenses / budget) * 100).toFixed(1)}% of budget
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Income Section */}
                        <div className="flex flex-col items-center justify-center gap-3 h-auto min-h-[140px] rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:bg-transparent dark:border dark:border-green-500 p-4 hover:shadow-md transition-all duration-300">
                            <h3 className="text-lg text-green-700 text-center font-medium">Total Income</h3>
                            <span className="text-[30px] font-bold text-green-700 text-center">
                                {formatCurrency(totalIncome)}
                            </span>
                            <TrendArrow trend={incomeTrend} variant="income" />
                            <div className="text-center space-y-1">
                                <p className="text-xs text-gray-600 dark:text-white">{incomeDifference}</p>
                                <p className="text-xs text-gray-600 dark:text-white">
                                    Covers {incomeCoverage.toFixed(0)}% of expenses
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* AI Suggestions inside the card */}
                    <div className="flex items-center gap-3 mt-5">
                        <div className="flex-1">
                          {tipLoading && (
                            <span className="text-white text-sm inline-flex items-center">
                              <span>💡 Thinking</span>
                              <span className="flex items-center gap-1 ml-2">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            </span>
                          )}
                          {!tipLoading && displayTip && <span className="text-white text-sm whitespace-pre-wrap">💡 {displayTip}</span>}
                          {!tipLoading && !displayTip && !tipError && (
                            <span className="text-white text-sm">💡 Get AI tips based on your data</span>
                          )}
                          {tipError && <p className="text-red-600 text-xs mt-1">{tipError}</p>}
                          {isRateLimited && <p className="text-yellow-600 text-xs mt-1">Rate limit reached. Try later.</p>}
                        </div>
                        <button
                          type="button"
                          onClick={tipLoading ? abort : refreshTip}
                          className={`text-sm font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${tipLoading ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
                          disabled={Date.now() < cooldownUntil}
                        >
                          {tipLoading ? (
                            <>
                              <svg className="w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                              </svg>
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Image src="/sparkles.svg" alt="Sparkles" width={16} height={16} />
                              <span>{Date.now() < cooldownUntil ? 'Please wait…' : 'Get AI Insight'}</span>
                            </>
                          )}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default TransactionsCounters