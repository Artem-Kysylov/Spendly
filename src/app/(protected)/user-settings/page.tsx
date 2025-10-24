'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { UserAuth } from '@/context/AuthContext'
import useModal from '@/hooks/useModal'
import Button from "@/components/ui-elements/Button"
import SignOutModal from '@/components/modals/SignOutModal'
import EditProfileModal from '@/components/modals/EditProfileModal'
import NotificationSettings from '@/components/notifications/NotificationSettings'
import ProfileCard from '@/components/user-settings/ProfileCard'
import ThemeSwitcher from '@/components/ui-elements/ThemeSwitcher'
import useIsPWAInstalled from '@/hooks/useIsPWAInstalled'
import AppInstallModal from '@/components/modals/AppInstallModal'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import LanguageSelect from '@/components/ui-elements/locale/LanguageSelect'
import { useTranslations } from 'next-intl'
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
    cookies().get('NEXT_LOCALE')?.value ||
    cookies().get('spendly_locale')?.value ||
    DEFAULT_LOCALE

  const locale = isSupportedLanguage(cookieLocale || '') ? (cookieLocale as any) : DEFAULT_LOCALE
  const t = await getTranslations({ locale, namespace: 'pages.userSettings.meta' })

  return {
    title: t('title'),
    description: t('description')
  }
}


// Инициализация переводов
const tSettings = useTranslations('userSettings')
const tPricing = useTranslations('pricing')
const tCTA = useTranslations('cta')
const tCommon = useTranslations('common')

export async function generateMetadata(): Promise<import('next').Metadata> {
  const [{ cookies }, { DEFAULT_LOCALE, isSupportedLanguage }, { getTranslations }] = await Promise.all([
    import('next/headers'),
    import('@/i18n/config'),
    import('next-intl/server')
  ])
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value || cookies().get('spendly_locale')?.value || DEFAULT_LOCALE
  const locale = isSupportedLanguage(cookieLocale || '') ? (cookieLocale as any) : DEFAULT_LOCALE
  const t = await getTranslations({ locale, namespace: 'pages.userSettings.meta' })
  return { title: t('title'), description: t('description') }
}