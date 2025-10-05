// Canonical phrases and simple localization helpers (no server dependencies)

export const EN_EMPTY_THIS_WEEK = 'No expenses recorded this week.'
export const EN_EMPTY_LAST_WEEK = 'No expenses recorded last week.'
export const EN_EMPTY_THIS_MONTH = 'No expenses recorded this month.'
export const EN_EMPTY_LAST_MONTH = 'No expenses recorded last month.'
export const EN_EMPTY_GENERIC = 'No expenses recorded for the requested period.'

export const RU_EMPTY_THIS_WEEK = 'За эту неделю расходов не найдено.'
export const RU_EMPTY_LAST_WEEK = 'За прошлую неделю расходов не найдено.'
export const RU_EMPTY_THIS_MONTH = 'За этот месяц расходов не найдено.'
export const RU_EMPTY_LAST_MONTH = 'За прошлый месяц расходов не найдено.'
export const RU_EMPTY_GENERIC = 'Нет расходов за запрошенный период.'

export function localizeEmptyWeekly(period: 'thisWeek' | 'lastWeek', locale?: string): string {
  const isRu = (locale || '').toLowerCase().startsWith('ru')
  if (period === 'thisWeek') return isRu ? RU_EMPTY_THIS_WEEK : EN_EMPTY_THIS_WEEK
  return isRu ? RU_EMPTY_LAST_WEEK : EN_EMPTY_LAST_WEEK
}

export function localizeEmptyMonthly(period: 'thisMonth' | 'lastMonth', locale?: string): string {
  const isRu = (locale || '').toLowerCase().startsWith('ru')
  if (period === 'thisMonth') return isRu ? RU_EMPTY_THIS_MONTH : EN_EMPTY_THIS_MONTH
  return isRu ? RU_EMPTY_LAST_MONTH : EN_EMPTY_LAST_MONTH
}

export function localizeEmptyGeneric(locale?: string): string {
  const isRu = (locale || '').toLowerCase().startsWith('ru')
  return isRu ? RU_EMPTY_GENERIC : EN_EMPTY_GENERIC
}

export function periodLabel(
  p: 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'unknown',
  locale?: string
): string {
  const isRu = (locale || '').toLowerCase().startsWith('ru')
  if (isRu) {
    return p === 'thisWeek' ? 'Эта неделя'
      : p === 'lastWeek' ? 'Прошлая неделя'
      : p === 'thisMonth' ? 'Этот месяц'
      : p === 'lastMonth' ? 'Прошлый месяц'
      : 'Запрошенный период'
  }
  return p === 'thisWeek' ? 'This week'
    : p === 'lastWeek' ? 'Last week'
    : p === 'thisMonth' ? 'This month'
    : p === 'lastMonth' ? 'Last month'
    : 'Requested period'
}