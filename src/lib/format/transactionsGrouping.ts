import type { Transaction } from '@/types/types'

export type GroupedTransactions = { date: string; items: Transaction[] }

function toYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function groupTransactionsByDate(transactions: Transaction[]): GroupedTransactions[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const map = new Map<string, Transaction[]>()
  for (const t of sorted) {
    const key = toYmd(new Date(t.created_at))
    const bucket = map.get(key) || []
    bucket.push(t)
    map.set(key, bucket)
  }

  const groups: GroupedTransactions[] = []
  for (const [date, items] of map.entries()) {
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    groups.push({ date, items })
  }

  groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return groups
}

export function formatGroupHeader(dateStr: string, locale: string, t: (key: string) => string): string {
  const target = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameYmd = (a: Date, b: Date) => toYmd(a) === toYmd(b)

  if (isSameYmd(target, today)) {
    const pretty = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(target)
    return `${t('today')}, ${pretty}`
  }
  if (isSameYmd(target, yesterday)) {
    return t('yesterday')
  }
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(target)
}

export function formatTime(dateStr: string, locale: string): string {
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d)
}