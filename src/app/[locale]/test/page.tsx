'use client'

import { useEffect, useState } from 'react'
import CountryCombobox from '@/components/ui-elements/locale/CountryCombobox'
import CurrencyCombobox from '@/components/ui-elements/locale/CurrencyCombobox'
import LanguageSelect from '@/components/ui-elements/locale/LanguageSelect'
import { detectInitialLocale } from '@/i18n/detect'
import { formatMoney } from '@/lib/format/money'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { getTranslations } from 'next-intl/server'
import TestPageClient from './TestPageClient'

export default function TestPage() {
  return <TestPageClient />
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieLocale =
    cookies().get('NEXT_LOCALE')?.value ||
    cookies().get('spendly_locale')?.value ||
    DEFAULT_LOCALE

  const locale = isSupportedLanguage(cookieLocale || '') ? (cookieLocale as any) : DEFAULT_LOCALE
  const t = await getTranslations({ locale, namespace: 'pages.test.meta' })

  return {
    title: t('title'),
    description: t('description')
  }
}