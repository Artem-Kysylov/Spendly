export function formatDate(
  date: string | number | Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date)
  const fmt = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...options
  })
  return fmt.format(d)
}