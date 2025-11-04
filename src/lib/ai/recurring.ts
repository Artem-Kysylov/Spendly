// Эвристики выявления повторяющихся транзакций: нормализация, группировка, детекция cadence, медиана суммы, прогноз next_due_date.

export type RecurrenceCadence = 'weekly' | 'monthly'

export interface RecurringCandidate {
  title_pattern: string
  budget_folder_id: string | null
  avg_amount: number
  cadence: RecurrenceCadence
  next_due_date: string
  count: number
}

function normalizeTitle(raw: string): string {
  const s = (raw || '').toLowerCase()
  // Убираем эмодзи, пунктуацию, лишние пробелы, цифры-хвосты
  const stripped = s
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '') // эмодзи
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')      // пунктуация
    .replace(/\s+/g, ' ')                   // пробелы
    .trim()
  // Убираем типовые хвосты вида #1234, *1234, и т.д.
  return stripped.replace(/(?:^|\s)[#*]?\d{3,}\b/g, '').trim()
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const arr = nums.slice().sort((a, b) => a - b)
  const mid = Math.floor(arr.length / 2)
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
}

function medianAmount(txs: Array<{ amount: number }>): number {
  return median(txs.map(t => Number(t.amount)).filter(n => Number.isFinite(n)))
}

function dayDiff(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function detectCadenceFromDates(dates: Date[]): RecurrenceCadence | null {
  if (dates.length < 3) return null
  const sorted = dates.slice().sort((a, b) => a.getTime() - b.getTime())
  const diffs = []
  for (let i = 1; i < sorted.length; i++) {
    diffs.push(dayDiff(sorted[i - 1], sorted[i]))
  }
  const m = median(diffs)
  if (m >= 5 && m <= 9) return 'weekly' // около 7 ±2 дня
  if (m >= 25 && m <= 35) return 'monthly' // около 30 ±5 дней
  return null
}

function forecastNextDueDate(dates: Date[], cadence: RecurrenceCadence): Date {
  const sorted = dates.slice().sort((a, b) => a.getTime() - b.getTime())
  const last = sorted[sorted.length - 1]
  const next = new Date(last)
  if (cadence === 'weekly') {
    next.setDate(next.getDate() + 7)
  } else {
    // monthly: приблизительно +30 (можно улучшить до календарного месяца, но MVP ок)
    next.setDate(next.getDate() + 30)
  }
  return next
}

function clampTolerance(date: Date, cadence: RecurrenceCadence): { windowStart: Date; windowEnd: Date } {
  const start = new Date(date)
  const end = new Date(date)
  const tol = cadence === 'weekly' ? 2 : 5
  start.setDate(start.getDate() - tol)
  end.setDate(end.getDate() + tol)
  return { windowStart: start, windowEnd: end }
}

export function findRecurringCandidates(
  txs: Array<{ title: string; amount: number; type: 'expense' | 'income'; budget_folder_id: string | null; created_at: string }>,
  windowDays: number = 120
): RecurringCandidate[] {
  const now = new Date()
  const windowStart = new Date()
  windowStart.setDate(now.getDate() - Math.max(90, Math.min(windowDays, 180)))

  // Фильтруем по окну и только расходы
  const recentExpenses = txs.filter(t => {
    if (t.type !== 'expense') return false
    const d = new Date(t.created_at)
    return d >= windowStart && d <= now
  })

  // Группировка по нормализованному заголовку
  const byKey = new Map<string, Array<typeof recentExpenses[number]>>()
  for (const t of recentExpenses) {
    const key = normalizeTitle(t.title || '')
    if (!key) continue
    const arr = byKey.get(key) || []
    arr.push(t)
    byKey.set(key, arr)
  }

  const candidates: RecurringCandidate[] = []
  for (const [key, group] of byKey.entries()) {
    if (group.length < 3) continue // минимум 3 появления

    const dates = group.map(g => new Date(g.created_at))
    const cadence = detectCadenceFromDates(dates)
    if (!cadence) continue

    const avg = medianAmount(group)
    // Берем чаще встречающийся budget_folder_id, либо null
    const bucket = mostCommon(group.map(g => g.budget_folder_id ?? null))

    // Прогноз
    const next = forecastNextDueDate(dates, cadence)
    // Допуск — для информации (вычисляем окно, но храним центральную дату)
    const nextISO = next.toISOString().slice(0, 10)

    candidates.push({
      title_pattern: key,
      budget_folder_id: bucket,
      avg_amount: avg,
      cadence,
      next_due_date: nextISO,
      count: group.length
    })
  }

  // Сортируем по сумме (медиана) убыв.
  candidates.sort((a, b) => b.avg_amount - a.avg_amount)
  return candidates.slice(0, 20)
}

function mostCommon<T>(arr: T[]): T {
  const freq = new Map<T, number>()
  for (const x of arr) freq.set(x, (freq.get(x) || 0) + 1)
  let best: T = arr[0]
  let bestN = 0
  for (const [k, v] of freq.entries()) {
    if (v > bestN) { best = k; bestN = v }
  }
  return best
}