export const getPreviousMonthRange = (): { start: Date; end: Date } => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const start = new Date(previousYear, previousMonth, 1)
  const end = new Date(previousYear, previousMonth + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export const getCurrentMonthRange = (): { start: Date; end: Date } => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  // Текущая дата как конец текущего месяца (для счетчиков «на сегодня»)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start, end }
}