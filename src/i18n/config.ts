import type { Language } from '@/types/locale'

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'uk', 'ru', 'hi', 'id', 'ja', 'ko']
export const DEFAULT_LOCALE: Language = 'en'

export function isSupportedLanguage(lang: string): lang is Language {
  return SUPPORTED_LANGUAGES.includes(lang as Language)
}

export async function loadMessages(locale: Language): Promise<Record<string, any>> {
  switch (locale) {
    case 'uk':
      return (await import('@/locales/uk.json')).default
    case 'ru':
      return (await import('@/locales/ru.json')).default
    case 'hi':
      return (await import('@/locales/hi.json')).default
    case 'id':
      return (await import('@/locales/id.json')).default
    case 'ja':
      return (await import('@/locales/ja.json')).default
    case 'ko':
      return (await import('@/locales/ko.json')).default
    case 'en':
    default:
      return (await import('@/locales/en.json')).default
  }
}