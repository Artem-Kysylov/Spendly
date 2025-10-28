// Общие утилиты для AI подсказок: локаль, санитизация, кэш, ключи контекста

export type Locale = 'ru' | 'en'

export function getLocalePreference(): Locale {
  if (typeof window !== 'undefined') {
    // Prefer cookies set by user settings
    try {
      const cookies = document.cookie.split(';').map(s => s.trim())
      const find = (name: string) => {
        const pref = cookies.find(c => c.startsWith(`${name}=`))
        return pref ? decodeURIComponent(pref.split('=')[1]).toLowerCase() : null
      }
      const cookieLocale = find('spendly_locale') || find('NEXT_LOCALE')
      if (cookieLocale) {
        if (cookieLocale.startsWith('ru')) return 'ru'
        return 'en'
      }
    } catch {}

    // Fallback to browser languages
    const langs = navigator.languages ?? [navigator.language]
    for (const l of langs) {
      const code = (l || '').toLowerCase()
      if (code.startsWith('ru')) return 'ru'
    }
    return 'en'
  }
  return 'en'
}

export function sanitizeTip(text: string, maxLen: number = 320): string {
  if (!text) return ''
  let s = text.trim()

  // Удаляем вводные фразы
  const introPatterns = [
    /^as an ai.*$/i,
    /^как (ai|ии).*/i,
    /^i am an ai.*$/i,
    /^я (являюсь|есть) (ai|ии).*/i,
  ]
  for (const re of introPatterns) {
    s = s.replace(re, '').trim()
  }

  // Удаляем markdown заголовки
  s = s.replace(/^#+\s*/gm, '').trim()

  // Обрезаем до maxLen аккуратно
  if (s.length > maxLen) {
    s = s.slice(0, maxLen).trim()
    // Если обрезали в середине слова, чуть подрежем до пробела
    const lastSpace = s.lastIndexOf(' ')
    if (lastSpace > maxLen - 40) {
      s = s.slice(0, lastSpace).trim()
    }
    s += '…'
  }

  return s
}

export function makeContextKey(prompt: string): string {
  // Простой детерминированный хэш строки (не крипто)
  let hash = 0
  for (let i = 0; i < prompt.length; i++) {
    hash = (hash << 5) - hash + prompt.charCodeAt(i)
    hash |= 0
  }
  return `k${hash}`
}

export function getCachedTip(key: string, ttlMs: number = 120000): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`ai_tip_cache_${key}`)
    if (!raw) return null
    const { value, ts } = JSON.parse(raw)
    if (typeof ts !== 'number' || typeof value !== 'string') return null
    const age = Date.now() - ts
    if (age > ttlMs) return null
    return value
  } catch {
    return null
  }
}

export function setCachedTip(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      `ai_tip_cache_${key}`,
      JSON.stringify({ value, ts: Date.now() })
    )
  } catch {
    // ignore quota errors
  }
}