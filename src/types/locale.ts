export type Language = 'en' | 'uk' | 'ru' | 'hi' | 'id' | 'ja' | 'ko'

export type DetectSource = 'geoip' | 'navigator' | 'fallback'

export interface Country {
  code: string
  name: string
  language: Language | string
  currency: string
  symbol?: string
  default?: boolean
}

export interface Currency {
  code: string
  name?: string
  symbol?: string
}

export interface UserLocaleSettings {
  country: string
  currency: string
  locale: Language
  source?: DetectSource
  autodetected?: boolean
}