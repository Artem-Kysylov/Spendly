'use client'

// Imports 
import React, { forwardRef } from 'react'
import { formatCurrency } from '@/lib/chartUtils'
import { ChartDescription } from './ChartDescription'
import Image from 'next/image'


// Import types
import { ChartFilters } from '@/types/types'
import { useAISuggestions } from '@/hooks/useAISuggestions'
import { buildBarChartPrompt } from '@/lib/ai/promptBuilders'
import { getLocalePreference, sanitizeTip, makeContextKey, getCachedTip, setCachedTip } from '@/lib/ai/tipUtils'

// Import chart components
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomTooltip } from './CustomTooltip'
import { useTranslations } from 'next-intl'
import { useSubscription } from '@/hooks/useSubscription'
import UpgradeCornerPanel from '../free/UpgradeCornerPanel'
import ProLockLabel from '../free/ProLockLabel'

// Types
interface ExpensesBarData {
  period: string      // "Week 1", "Week 2" или "Jan", "Feb"
  amount: number      // Сумма трат за период
  fill: string        // Цвет столбца
}

interface ExpensesBarChartProps {
  data: ExpensesBarData[]
  filters: ChartFilters
  title?: string
  description?: string
  showGrid?: boolean
  showTooltip?: boolean
  height?: number
  currency?: string
  isLoading?: boolean
  error?: string | null
  emptyMessage?: string
  className?: string
}

// Компонент ExpensesBarChart
const ExpensesBarChartComponent = forwardRef<HTMLDivElement, ExpensesBarChartProps>(({ 
  data,
  filters,
  title,
  description,
  showGrid = true,
  showTooltip = true,
  height = 240,
  currency = "USD",
  isLoading = false,
  error = null,
  emptyMessage = "No expenses data available",
  className = ""
}, ref) => {
  
  const { text: tip, loading: tipLoading, error: tipError, isRateLimited, fetchSuggestion, abort } = useAISuggestions()
  const { subscriptionPlan } = useSubscription()
  const isPro = subscriptionPlan === 'pro'

  const [displayTip, setDisplayTip] = React.useState<string>('')
  const [cooldownUntil, setCooldownUntil] = React.useState<number>(0)
  const lastKeyRef = React.useRef<string | null>(null)

  // Один бесплатный превью для Free, затем блокируем кнопку и показываем CTA
  const [previewUsed, setPreviewUsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem('spendly:ai_preview_expenses_used') === '1'
    } catch { return false }
  })
  const [showUpgrade, setShowUpgrade] = React.useState<boolean>(false)

  const canShowUpgradePopup = () => {
    try {
      const count = parseInt(window.localStorage.getItem('spendly:upgrade_popup_count') || '0', 10)
      return count < 3
    } catch { return true }
  }

  const markUpgradePopupShown = () => {
    try {
      const count = parseInt(window.localStorage.getItem('spendly:upgrade_popup_count') || '0', 10)
      window.localStorage.setItem('spendly:upgrade_popup_count', String(count + 1))
    } catch { /* no-op */ }
  }

  // Refresh AI tip based on chart data
  const refreshTip = () => {
    const now = Date.now()
    if (now < cooldownUntil) return
    setCooldownUntil(now + 4000) // anti-spam: 4 seconds

    // Edge case: no data at all
    if (!data || data.length === 0) {
      setDisplayTip('Недостаточно данных для анализа, попробуйте позже.')
      return
    }

    // Если Free и превью уже использовано — блокируем
    if (!isPro && previewUsed) {
      return
    }

    const locale = getLocalePreference()
    const prompt = buildBarChartPrompt({
      data,
      filters,
      currency,
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

  // Effect to handle tip updates
  React.useEffect(() => {
    if (tip && lastKeyRef.current) {
      const sanitized = sanitizeTip(tip)
      setDisplayTip(sanitized)
      setCachedTip(lastKeyRef.current, tip)

      // Отмечаем использование бесплатного превью для Free
      if (!isPro && !previewUsed) {
        setPreviewUsed(true)
        try { window.localStorage.setItem('spendly:ai_preview_expenses_used', '1') } catch { /* no-op */ }
        if (canShowUpgradePopup()) {
          setShowUpgrade(true)
          markUpgradePopupShown()
        }
      }
    }
  }, [tip])

  const tCharts = useTranslations('charts')
  const resolvedTitle = title || tCharts('transactionsBar.title')
  const resolvedEmpty = emptyMessage || tCharts('states.noExpensesData')

  if (isLoading) {
    return (
      <Card className={className} ref={ref}>
        <CardHeader>
          <CardTitle>{resolvedTitle}</CardTitle>
          {description && <ChartDescription>{description}</ChartDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[240px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className} ref={ref}>
        <CardHeader>
          <CardTitle>{title || "Expenses Chart"}</CardTitle>
          {description && <ChartDescription>{description}</ChartDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className} ref={ref}>
        <CardHeader>
          <CardTitle>{resolvedTitle}</CardTitle>
          {description && <ChartDescription>{description}</ChartDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[240px] flex items-center justify-center">
            <p className="text-muted-foreground">{resolvedEmpty}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className} ref={ref}>
      <CardHeader>
        <CardTitle>{resolvedTitle}</CardTitle>
        {description && <ChartDescription>{description}</ChartDescription>}
      </CardHeader>
      <CardContent>
        {showUpgrade && <UpgradeCornerPanel />}
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(value, currency)}
              />
              {showTooltip && (
                <Tooltip 
                  content={<CustomTooltip currency={currency} />}
                />
              )}
              <Bar 
                dataKey="amount" 
                fill="#8884d8"
                radius={[4, 4, 0, 0]}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Suggestions inside the card — matched to Counters */}
        <div className="flex items-center gap-3 mt-5">
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
              <span className="text-black dark:text-white text-sm">💡 {tCharts('ai.tips')}</span>
            )}
            {tipError && <p className="text-red-600 text-xs mt-1">{tipError}</p>}
          </div>

          {/* Кнопка инсайта или заблокированный блок после одного превью в Free */}
          {(!isPro && previewUsed) ? (
            <div className="text-sm font-medium px-4 py-2 rounded-md bg-muted text-muted-foreground flex items-center gap-2">
              <ProLockLabel />
              <span>Полные инсайты доступны в Pro</span>
              <a href="/payment" className="ml-2 underline text-primary">Upgrade to Pro</a>
            </div>
          ) : (
            <button
              onClick={tipLoading ? abort : refreshTip}
              className={`text-sm font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-2 ${tipLoading ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
              disabled={isRateLimited}
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
                  <span>{tCharts('ai.getInsight')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

ExpensesBarChartComponent.displayName = 'ExpensesBarChart'
export const ExpensesBarChart = ExpensesBarChartComponent
export type { ExpensesBarData, ExpensesBarChartProps }