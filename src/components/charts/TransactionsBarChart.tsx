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

// Import components 
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomTooltip } from './CustomTooltip'


// Интерфейс для данных бар-чарта трат
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

  const [displayTip, setDisplayTip] = React.useState<string>('')
  const [cooldownUntil, setCooldownUntil] = React.useState<number>(0)
  const lastKeyRef = React.useRef<string | null>(null)

  const refreshTip = () => {
    const now = Date.now()
    if (now < cooldownUntil) return
    setCooldownUntil(now + 4000) // анти-спам

    // Краевой случай: мало данных для сравнения
    if (!data || data.length < 2) {
      setDisplayTip('Недостаточно данных для сравнения, попробуйте позже.')
      return
    }

    const locale = getLocalePreference()
    const prompt = buildBarChartPrompt({
      data: data.map(({ period, amount }) => ({ period, amount })),
      filters: { period: filters.period, dataType: filters.dataType },
      currency,
      locale,
      windowSize: filters.period === 'Week' ? 6 : 6
    })

    const key = makeContextKey(prompt)
    lastKeyRef.current = key

    const cached = getCachedTip(key, 120000)
    if (cached) {
      setDisplayTip(sanitizeTip(cached))
      return
    }

    fetchSuggestion(prompt)
  }

  React.useEffect(() => {
    if (!tip) return
    const clean = sanitizeTip(tip)
    setDisplayTip(clean)
    if (lastKeyRef.current) setCachedTip(lastKeyRef.current, clean)
  }, [tip])

  // Генерируем заголовок на основе фильтров
  const generateTitle = () => {
    if (title) return title
    
    const periodText = filters.period === 'Week' ? 'Weekly' : 'Monthly'
    const typeText = filters.dataType === 'Expenses' ? 'Expenses' : 'Income'
    return `${periodText} ${typeText}`
  }

  // Генерируем описание на основе фильтров
  const generateDescription = () => {
    if (description) return description
    
    const periodText = filters.period === 'Week' ? 'weeks' : 'months'
    const typeText = filters.dataType === 'Expenses' ? 'expenses' : 'income'
    return `Your ${typeText} breakdown by ${periodText}`
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{generateTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[240px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{generateTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[240px]">
            <div className="text-destructive">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{generateTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">{emptyMessage}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatYAxisLabel = (value: number) => {
    return formatCurrency(value, currency, true)
  }

  return (
    <Card ref={ref} className={`w-full ${className} flex flex-col h-full`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{generateTitle()}</CardTitle>
        <ChartDescription>{generateDescription()}</ChartDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="4 4"
                horizontal={true}
                vertical={false}
                stroke="hsl(var(--muted-foreground))"
                opacity={0.18}
              />
            )}
            
            <XAxis 
              dataKey="period"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              height={28}
              tickMargin={4}
              interval={0}
            />
            
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxisLabel}
            />
            
            {showTooltip && (
              <Tooltip 
                content={<CustomTooltip currency={currency} />}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
              />
            )}
            
            <Bar
              dataKey="amount"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
        
        {/* AI Suggestions */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            {/* Левая часть: плейсхолдер/прелоадер. Когда есть ответ — плейсхолдер пропадает */}
            {!displayTip && (
              <>
                {tipLoading ? (
                  <span className="text-white text-sm inline-flex items-center">
                    <span>💡 Thinking</span>
                    <span className="flex items-center gap-1 ml-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </span>
                ) : (
                  <span className="text-white text-sm">💡 Get AI tips based on your data</span>
                )}
              </>
            )}

            {/* Правая часть: кнопка Get tip / Stop */}
            <button
              className={`text-sm font-medium px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${tipLoading ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
              onClick={tipLoading ? abort : refreshTip}
              disabled={isRateLimited || Date.now() < cooldownUntil}
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

          {tipError && <div className="text-xs text-amber-700 mt-1">{tipError}</div>}

          {/* Текст подсказки с лампочкой. Плейсхолдер убирается при наличии displayTip */}
          {displayTip && (
            <div className="text-sm text-white mt-1 whitespace-pre-wrap">💡 {displayTip}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

ExpensesBarChartComponent.displayName = 'ExpensesBarChart'
export const ExpensesBarChart = ExpensesBarChartComponent
export type { ExpensesBarData, ExpensesBarChartProps }