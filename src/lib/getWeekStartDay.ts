/**
 * Returns the day of week that starts the week for a given locale
 * @param locale - The locale string (e.g., 'en-US', 'ru-RU')
 * @returns 0 for Sunday (US, Japan, Korea), 1 for Monday (Europe, Russia, etc.)
 */
export function getWeekStartDay(locale: string): 0 | 1 {
  // Locales that start week on Sunday
  const sundayLocales = ['en-US', 'ja-JP', 'ja', 'ko-KR', 'ko'];
  
  const normalizedLocale = locale.toLowerCase();
  
  if (sundayLocales.some(l => normalizedLocale.startsWith(l.toLowerCase()))) {
    return 0; // Sunday
  }
  
  return 1; // Monday (default for most locales)
}
