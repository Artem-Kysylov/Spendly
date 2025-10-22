export function formatMoney(
  amount: number,
  currency: string,
  locale: string,
  options?: Intl.NumberFormatOptions
): string {
  try {
    const fmt = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
      ...options
    })
    return fmt.format(amount)
  } catch {
    const fallback = new Intl.NumberFormat('en', { maximumFractionDigits: 2 })
    return `${currency} ${fallback.format(amount)}`
  }
}