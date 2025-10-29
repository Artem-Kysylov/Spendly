import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const cookieLocale =
    cookies().get('NEXT_LOCALE')?.value ||
    cookies().get('spendly_locale')?.value ||
    DEFAULT_LOCALE

  const locale = isSupportedLanguage(cookieLocale || '') ? (cookieLocale as string) : DEFAULT_LOCALE

  // Перенаправляем на локализованный корень, например /en
  redirect(`/${locale}`)
}