import { RolloverMode, BudgetRolloverSettings } from '@/types/types'
import { getPreviousMonthRange, getCurrentMonthRange } from '@/lib/dateUtils'

type MonthlyInput = { allocated: number; spent: number }
type ApplyInput = {
  baseAllocatedNext: number
  previous: MonthlyInput
  settings: BudgetRolloverSettings
}
type ApplyResult = {
  allocatedNext: number
  rolloverFromPrev: number
}

// УБРАНО: локальная декларация RolloverMode, чтобы не конфликтовать с импортом
// export type RolloverMode = 'positive-only' | 'allow-negative'

export function clamp(value: number, cap?: number | null): number {
  if (cap == null || Number.isNaN(cap)) return value
  if (value > 0) return Math.min(value, cap)
  return Math.max(value, -cap)
}

export function computeCarry(
  allocated: number,
  spentPrev: number,
  mode: RolloverMode = 'positive-only',
  cap?: number | null
): number {
  const raw = allocated - spentPrev
  const carry = mode === 'positive-only' ? Math.max(raw, 0) : raw
  return clamp(carry, cap)
}

export function sumCarry(values: Array<number | undefined>): { positive: number; negative: number } {
  let positive = 0
  let negative = 0
  for (const v of values) {
    if (typeof v !== 'number') continue
    if (v >= 0) positive += v
    else negative += -v
  }
  return { positive, negative }
}

export function computeRollover(input: { allocated: number; spent: number }, settings: BudgetRolloverSettings): number {
  return settings.rolloverEnabled
    ? computeCarry(input.allocated ?? 0, input.spent ?? 0, settings.rolloverMode, settings.rolloverCap)
    : 0
}

export function applyToNextMonth({ baseAllocatedNext, previous, settings }: ApplyInput): ApplyResult {
  const carry = computeRollover(previous, settings)
  return {
    allocatedNext: (baseAllocatedNext ?? 0) + carry,
    rolloverFromPrev: carry
  }
}

export function shouldApplyRollover(appliedAt?: string | null, sourceMonth?: string | null, targetMonth?: string | null): boolean {
  if (!targetMonth) return false
  if (appliedAt && sourceMonth === targetMonth) return false
  return true
}

export function formatMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  return `${y}-${m}`
}

export function currentMonthKey(): string {
  const range = getCurrentMonthRange()
  return formatMonthKey(range.start)
}

export function previousMonthKey(): string {
  const range = getPreviousMonthRange()
  return formatMonthKey(range.start)
}