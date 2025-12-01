'use client'

// Imports 
import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../../lib/supabaseClient' 
import { UserAuth } from '../../context/AuthContext'
import { Pencil } from 'lucide-react'

// Import components 
import { Card, CardContent } from '@/components/ui/card'

// Import UI elements 
import BudgetProgressBar from '../ui-elements/BudgetProgressBar'
import TrendArrow from '../ui-elements/TrendArrow'

// Import utils 
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
import { useTranslations } from 'next-intl'

// Component: TransactionsCounters
function TransactionsCounters({ onIconClick, refreshTrigger }: { onIconClick: () => void; refreshTrigger?: number }) {
  const { session } = UserAuth()
  const tDashboard = useTranslations('dashboard')
  const tCharts = useTranslations('charts')
  const tBudgets = useTranslations('budgets')

  // State for transactions and budget data
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budget, setBudget] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)

  // Fetch transactions and budget data
  const fetchData = async () => {
      if (!session?.user?.id) return

      setLoading(true)
      try {
          // Fetch transactions
          const { data: transactionsData, error: transactionsError } = await supabase
              .from('transactions')
              .select('*')
              .eq('user_id', session.user.id)
              .order('created_at', { ascending: false })

          if (transactionsError) {
              console.error('Error fetching transactions:', transactionsError)
              return
          }

          // Fetch budget
          const { data: budgetData, error: budgetError } = await supabase
              .from('main_budget')
              .select('amount')
              .eq('user_id', session.user.id)
              .single()

          if (budgetError && budgetError.code !== 'PGRST116') {
              console.error('Error fetching budget:', budgetError)
              return
          }

          setTransactions(transactionsData || [])
          setBudget(budgetData?.amount || 0)
      } catch (error) {
          console.error('Error in fetchData:', error)
      } finally {
          setLoading(false)
      }
  }

  // Effect to fetch data on component mount and when session changes
  useEffect(() => {
      fetchData()
  }, [session?.user?.id, refreshTrigger])

  // Calculate current month data
  const currentMonthData = useMemo(() => {
      const { start, end } = getCurrentMonthRange()
      return transactions.filter(transaction => {
          const transactionDate = new Date(transaction.created_at)
          return transactionDate >= start && transactionDate <= end
      })
  }, [transactions])

  // Calculate previous month data
  const previousMonthData = useMemo(() => {
      const { start, end } = getPreviousMonthRange()
      return transactions.filter(transaction => {
          const transactionDate = new Date(transaction.created_at)
          return transactionDate >= start && transactionDate <= end
      })
  }, [transactions])

  // Calculate totals
  const totalExpenses = useMemo(() => {
      return currentMonthData
          .filter(transaction => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + transaction.amount, 0)
  }, [currentMonthData])

  const totalIncome = useMemo(() => {
      return currentMonthData
          .filter(transaction => transaction.type === 'income')
          .reduce((sum, transaction) => sum + transaction.amount, 0)
  }, [currentMonthData])

  const previousMonthExpenses = useMemo(() => {
      return previousMonthData
          .filter(transaction => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + transaction.amount, 0)
  }, [previousMonthData])

  const previousMonthIncome = useMemo(() => {
      return previousMonthData
          .filter(transaction => transaction.type === 'income')
          .reduce((sum, transaction) => sum + transaction.amount, 0)
  }, [previousMonthData])

  // Calculate derived values
  const budgetUsagePercentage = budget > 0 ? (totalExpenses / budget) * 100 : 0
  const remainingBudget = budget - totalExpenses
  const budgetStatus = budget === 0 ? 'not-set' : 
                      budgetUsagePercentage > 100 ? 'exceeded' : 
                      budgetUsagePercentage > 80 ? 'warning' : 'good'

  // Calculate trends
  const expensesTrend = calculatePercentageChange(previousMonthExpenses, totalExpenses)
  const incomeTrend = calculatePercentageChange(previousMonthIncome, totalIncome)
  const incomeCoverage = calculateIncomeCoverage(totalIncome, totalExpenses)

  // Format differences
  const expensesDifference = formatMonthlyDifference(
    previousMonthExpenses, 
    totalExpenses, 
    { label: tCharts('comparison.vsLastMonth'), currency: 'USD' }
  )
  const incomeDifference = formatMonthlyDifference(
    previousMonthIncome, 
    totalIncome, 
    { label: tCharts('comparison.vsLastMonth'), currency: 'USD' }
  )

  // AI suggestions hook — moved before conditional return to maintain hook order
  const { text: tip, loading: tipLoading, error: tipError, isRateLimited, fetchSuggestion, abort } = useAISuggestions()

  // Local state for displaying tip (with cache and sanitization)
  const [displayTip, setDisplayTip] = useState<string>('')
  const [cooldownUntil, setCooldownUntil] = useState<number>(0)
  const lastKeyRef = useRef<string | null>(null)

  // Effect to handle tip updates — перемещён выше раннего return
  useEffect(() => {
    if (tip && lastKeyRef.current) {
      const sanitized = sanitizeTip(tip)
      setDisplayTip(sanitized)
      setCachedTip(lastKeyRef.current, tip)
    }
  }, [tip]) 

  if (loading) {
      return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[140px] bg-gray-200 animate-pulse rounded-lg"></div>
              ))}
          </div>
      )
  }

  // Refresh AI tip based on current budget and expenses
  const refreshTip = () => {
    const now = Date.now()
    if (now < cooldownUntil) return
    setCooldownUntil(now + 4000) // anti-spam: 4 seconds

    // Edge case: no data at all
    const noData = budget === 0 && totalExpenses === 0 && totalIncome === 0
    if (noData) {
      setDisplayTip(tCharts('ai.noData'))
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

  return (
      <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
      >
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          >
              <Card className="bg-card border-border">
                  <CardContent className="p-3 md:p-6">
                  <motion.div 
                      className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
                  >
                      {/* Enhanced Budget Section */}
                      <motion.div 
                          style={{ willChange: 'opacity, transform' }}
                          className="group relative"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                      >
                          <div className="absolute top-3 right-3 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" onClick={onIconClick}>
                              <Pencil className="text-primary text-[18px] duration-300 hover:opacity-50"/>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center gap-3 h-auto min-h-[140px] rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:bg-none dark:bg-transparent dark:border dark:border-primary/40 p-4 hover:shadow-md transition-shadow duration-300">
                              <div className="flex items-center gap-2">
                                  <h3 className="text-lg text-primary text-center font-medium">
                                    {tDashboard('counters.totalBudget')}
                                  </h3>
                                  {budgetStatus === 'exceeded' && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                                      {tDashboard('counters.status.exceeded')}
                                    </span>
                                  )}
                                  {budgetStatus === 'warning' && (
                                    <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full">
                                      {tDashboard('counters.status.warning')}
                                    </span>
                                  )}
                                  {budgetStatus === 'not-set' && (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                      {tDashboard('counters.status.notSet')}
                                    </span>
                                  )}
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
                                              spentLabel={tBudgets('labels.spent')}
                                              leftLabel={tBudgets('labels.left')}
                                          />
                                      </div>
                                      {/* Вернул как было: центрированный блок остатка/процента */}
                                      <div className="text-center space-y-1">
                                          <p className="text-xs text-gray-700 dark:text-white font-medium">
                                              {formatCurrency(remainingBudget)} {tDashboard('counters.remaining')}
                                          </p>
                                          <p className="text-xs text-gray-600 dark:text-white">
                                              {budgetUsagePercentage.toFixed(1)}% {tDashboard('counters.usedPercent')}
                                          </p>
                                      </div>
                                  </>
                              )}
                          </div>
                      </motion.div>

                      {/* Enhanced Expenses Section */}
                      <motion.div 
                          style={{ willChange: 'opacity, transform' }}
                          className="flex flex-col items-center justify-center gap-3 h-auto min-h-[140px] rounded-lg bg-gradient-to-br from-red-50 to-red-100/50 dark:bg-none dark:bg-transparent dark:border dark:border-red-500/40 p-4 hover:shadow-md transition-shadow duration-300"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
                      >
                          <div className="flex items-center gap-2">
                              <h3 className="text-lg text-red-700 text-center font-medium">
                                {tDashboard('counters.totalExpenses')}
                              </h3>
                              {totalExpenses > budget && budget > 0 && (
                                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                                    {tDashboard('counters.overBudget')}
                                  </span>
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
                                      {((totalExpenses / budget) * 100).toFixed(1)}% {tDashboard('counters.ofBudget')}
                                  </p>
                              )}
                          </div>
                      </motion.div>

                      {/* Enhanced Income Section */}
                      <motion.div 
                          style={{ willChange: 'opacity, transform' }}
                          className="flex flex-col items-center justify-center gap-3 h-auto min-h-[140px] rounded-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:bg-none dark:bg-transparent dark:border dark:border-green-500/40 p-4 hover:shadow-md transition-shadow duration-300"
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
                      >
                          <div className="flex items-center gap-2">
                              <h3 className="text-lg text-green-700 text-center font-medium">
                                {tDashboard('counters.totalIncome')}
                              </h3>
                          </div>
                          <span className="text-[30px] font-bold text-green-700 text-center">
                              {formatCurrency(totalIncome)}
                          </span>
                          <TrendArrow trend={incomeTrend} variant="income" />
                          <div className="text-center space-y-1">
                              <p className="text-xs text-gray-600 dark:text-white">{incomeDifference}</p>
                              <p className="text-xs text-gray-600 dark:text-white">
                                  {tDashboard('counters.coversExpenses', { percent: incomeCoverage.toFixed(0) })}
                              </p>
                          </div>
                      </motion.div>
                  </motion.div>

                  {/* AI Suggestions inside the card */}
                  <motion.div 
                      className="flex items-center gap-3 mt-5"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: 0.6 }}
                  >
                      <div className="flex-1">
                        {tipLoading && (
                          <span className="text-black dark:text-white text-sm inline-flex items-center">
                            <span>💡 {tCharts('ai.thinking')}</span>
                            <span className="flex items-center gap-1 ml-2">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </span>
                        )}
                        {!tipLoading && displayTip && (
                          <span className="text-black dark:text-white text-sm whitespace-pre-wrap">💡 {displayTip}</span>
                        )}
                        {!tipLoading && !displayTip && !tipError && (
                          <span className="text-black dark:text-white text-sm">💡 {tCharts('ai.placeholder')}</span>
                        )}
                        {tipError && <p className="text-red-600 text-xs mt-1">{tipError}</p>}
                        {isRateLimited && <p className="text-yellow-600 text-xs mt-1">{tCharts('ai.rateLimited')}</p>}
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
                            <span>{tCharts('ai.stop')}</span>
                          </>
                        ) : (
                          <>
                            <Image src="/sparkles.svg" alt="Sparkles" width={16} height={16} />
                            <span>{Date.now() < cooldownUntil ? tCharts('ai.wait') : tCharts('ai.getInsight')}</span>
                          </>
                        )}
                      </button>
                  </motion.div>
              </CardContent>
          </Card>
          </motion.div>
      </motion.div>
  )
}

export default TransactionsCounters