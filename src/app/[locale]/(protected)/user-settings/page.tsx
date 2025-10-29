import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { getTranslations } from 'next-intl/server'
import UserSettingsClient from './UserSettingsClient'

export default function UserSettingsPage() {
  return <UserSettingsClient />
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieLocale =
    cookies().get('NEXT_LOCALE')?.value ??
    cookies().get('spendly_locale')?.value ??
    DEFAULT_LOCALE

  const locale = isSupportedLanguage(cookieLocale || '') ? (cookieLocale as any) : DEFAULT_LOCALE
  const t = await getTranslations({ locale, namespace: 'pages.userSettings.meta' })

  return {
    title: t('title'),
    description: t('description'),
  }
}