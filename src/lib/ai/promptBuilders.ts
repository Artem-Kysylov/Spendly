/* Prompt builders for AI suggestions based on component-specific data */

export type Locale = 'ru' | 'en'

type BarPoint = { period: string; amount: number }

export function buildCountersPrompt(params: {
  budget: number
  totalExpenses: number
  totalIncome: number
  previousMonthExpenses: number
  previousMonthIncome: number
  budgetUsagePercentage: number
  remainingBudget: number
  budgetStatus: 'not-set' | 'exceeded' | 'warning' | 'good'
  expensesTrendPercent: number
  incomeTrendPercent: number
  incomeCoveragePercent: number
  expensesDifferenceText: string
  incomeDifferenceText: string
  currency?: string
  locale?: Locale
}) {
  const {
    budget,
    totalExpenses,
    totalIncome,
    previousMonthExpenses,
    previousMonthIncome,
    budgetUsagePercentage,
    remainingBudget,
    budgetStatus,
    expensesTrendPercent,
    incomeTrendPercent,
    incomeCoveragePercent,
    expensesDifferenceText,
    incomeDifferenceText,
    currency = 'USD',
    locale = 'ru',
  } = params

  const context = {
    currency,
    budget,
    totalExpenses,
    totalIncome,
    previousMonthExpenses,
    previousMonthIncome,
    budgetUsagePercentage: Number(budgetUsagePercentage.toFixed(1)),
    remainingBudget,
    budgetStatus,
    expensesTrendPercent: Number(expensesTrendPercent.toFixed(1)),
    incomeTrendPercent: Number(incomeTrendPercent.toFixed(1)),
    incomeCoveragePercent: Number(incomeCoveragePercent.toFixed(1)),
    expensesDifferenceText,
    incomeDifferenceText,
  }

  const instructionRu =
    'Ты финансовый ассистент. На основе JSON ниже дай 1–2 практических совета, используя конкретные числа/проценты. Избегай общих фраз и осуждения. Тон дружелюбный. Вывод в 2–3 коротких предложения. Если бюджет не задан или данных мало, напиши нейтральный совет и предложи следующий шаг.'
  const instructionEn =
    'You are a budgeting assistant. Based on the JSON below, provide 1–2 practical tips using concrete numbers/percentages. Avoid generic phrases and judgment, keep a friendly tone. Output 2–3 short sentences. If budget is not set or data is limited, provide a neutral tip and suggest a next step.'

  const instruction = locale === 'ru' ? instructionRu : instructionEn

  return `${instruction}\n\nContext:\n${JSON.stringify(context)}`
}

export function buildBarChartPrompt(params: {
  data: BarPoint[]
  filters: { period: 'Week' | 'Month'; dataType: 'Expenses' | 'Income' }
  currency?: string
  locale?: Locale
  windowSize?: number // default based on filters.period
}) {
  const { data, filters, currency = 'USD', locale = 'ru' } = params
  const windowSize =
    params.windowSize ??
    (filters.period === 'Week' ? 6 : 6) // можно увеличить на 8 при желании

  const points = data.slice(-windowSize)
  const amounts = points.map((p) => p.amount)
  const periods = points.map((p) => p.period)
  const current = points[points.length - 1]?.amount ?? 0
  const prev = points[points.length - 2]?.amount ?? 0
  const delta = current - prev
  const pct =
    prev === 0 ? (current === 0 ? 0 : 100) : Number(((delta / prev) * 100).toFixed(1))
  const avg =
    amounts.length ? Number((amounts.reduce((a, b) => a + b, 0) / amounts.length).toFixed(1)) : 0
  const min = amounts.length ? Math.min(...amounts) : 0
  const max = amounts.length ? Math.max(...amounts) : 0

  const context = {
    currency,
    type: filters.dataType, // 'Expenses' | 'Income'
    periodMode: filters.period, // 'Week' | 'Month'
    windowSize,
    seriesPeriods: periods,
    seriesAmounts: amounts,
    current,
    previous: prev,
    delta,
    deltaPercent: pct,
    average: avg,
    min,
    max,
  }

  const introRu =
    'Ты финансовый ассистент. Проанализируй последние периоды из JSON. Сравни текущий и предыдущий период (укажи разницу и %), отметь среднее и отклонения, сделай персональный вывод (похвала/предупреждение). Дай 1–2 практических совета, упоминая реальные числа. Тон дружелюбный. Ответ 2–3 предложения.'
  const introEn =
    'You are a budgeting assistant. Analyze the recent periods from the JSON. Compare current vs previous (show absolute and % change), mention average and deviations, and provide a personal conclusion (encouragement/warning). Give 1–2 practical tips, referencing actual numbers. Friendly tone. Answer in 2–3 sentences.'

  const instruction = locale === 'ru' ? introRu : introEn

  return `${instruction}\n\nContext:\n${JSON.stringify(context)}`
}