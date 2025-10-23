import type { Language, UserLocaleSettings, DetectSource } from '@/types/locale'
import { DEFAULT_LOCALE, isSupportedLanguage } from './config'

type GeoIPResponse = {
  country?: string
  country_code?: string
  currency?: string
  languages?: string
}

const COUNTRY_TO_LOCALE: Record<string, Language> = {
  US: 'en',
  GB: 'en',
  CA: 'en',
  UA: 'uk',
  IN: 'hi',
  ID: 'id',
  JP: 'ja',
  KR: 'ko',
  DE: 'en',
  ES: 'en'
}

function mapCountryToLocale(countryCode?: string): Language {
  if (countryCode && COUNTRY_TO_LOCALE[countryCode]) return COUNTRY_TO_LOCALE[countryCode]
  return DEFAULT_LOCALE
}

function pickNavigatorLanguage(): Language | null {
  const langs = typeof navigator !== 'undefined'
    ? (navigator.languages ?? [navigator.language])
    : []
  for (const l of langs) {
    const code = l?.split('-')[0]
    if (code && isSupportedLanguage(code)) return code as Language
  }
  return null
}

async function fetchGeoIP(timeoutMs = 2500): Promise<GeoIPResponse | null> {
  try {
    // Try session cache first
    if (typeof window !== 'undefined' && 'sessionStorage' in window) {
      const cached = sessionStorage.getItem('spendly_geoip_cache')
      if (cached) {
        try {
          return JSON.parse(cached) as GeoIPResponse
        } catch {}
      }
    }

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch('https://ipapi.co/json/', { signal: controller.signal })
    clearTimeout(id)
    if (!res.ok) return null
    const json = await res.json()

    // Save to session cache
    if (typeof window !== 'undefined' && 'sessionStorage' in window) {
      try {
        sessionStorage.setItem('spendly_geoip_cache', JSON.stringify(json))
      } catch {}
    }

    return json
  } catch {
    return null
  }
}

export async function detectInitialLocale(): Promise<UserLocaleSettings> {
  // Try GeoIP first (client-first MVP)
  const geo = await fetchGeoIP()
  if (geo?.country_code || geo?.country) {
    const country = geo.country_code ?? geo.country ?? 'US'
    const currency = geo.currency ?? (country === 'UA' ? 'UAH' : 'USD')
    const locale = mapCountryToLocale(country)
    return { country, currency, locale, source: 'geoip', autodetected: true }
  }

  // Then browser language
  const nav = pickNavigatorLanguage()
  if (nav) {
    // Map common navigator languages to default country/currency
    const locale = nav
    const country = locale === 'uk' ? 'UA' : 'US'
    const currency = locale === 'uk' ? 'UAH' : 'USD'
    return { country, currency, locale, source: 'navigator', autodetected: true }
  }

  // Fallback
  return { country: 'US', currency: 'USD', locale: DEFAULT_LOCALE, source: 'fallback', autodetected: false }
}

export function normalizeLocaleSettings(s: Partial<UserLocaleSettings>): UserLocaleSettings {
  const locale = isSupportedLanguage(s.locale ?? '') ? (s.locale as Language) : DEFAULT_LOCALE
  const country = s.country ?? (locale === 'uk' ? 'UA' : 'US')
  const currency = s.currency ?? (country === 'UA' ? 'UAH' : 'USD')
  return { country, currency, locale }
}