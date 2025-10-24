import {getRequestConfig} from 'next-intl/server'
import {loadMessages, DEFAULT_LOCALE, isSupportedLanguage} from '@/i18n/config'
import type {Language} from '@/types/locale'

export default getRequestConfig(async ({locale}) => {
  const {cookies} = await import('next/headers')
  const cookieLocale =
    cookies().get('NEXT_LOCALE')?.value ||
    cookies().get('spendly_locale')?.value ||
    DEFAULT_LOCALE

  const effectiveLocaleCandidate = locale || cookieLocale || DEFAULT_LOCALE
  const effectiveLocale: Language = isSupportedLanguage(effectiveLocaleCandidate)
    ? (effectiveLocaleCandidate as Language)
    : DEFAULT_LOCALE

  return {
    locale: effectiveLocale,
    messages: await loadMessages(effectiveLocale)
  }
})