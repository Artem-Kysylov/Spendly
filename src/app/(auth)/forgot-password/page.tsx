'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import Button from '@/components/ui-elements/Button'
import { CheckCircle2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { getTranslations } from 'next-intl/server'
import ForgotPasswordClient from './ForgotPasswordClient'

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />
}

export async function generateMetadata(): Promise<Metadata> {
  const cookieLocale =
    cookies().get('NEXT_LOCALE')?.value ||
    cookies().get('spendly_locale')?.value ||
    DEFAULT_LOCALE

  const locale = isSupportedLanguage(cookieLocale || '') ? (cookieLocale as any) : DEFAULT_LOCALE
  const t = await getTranslations({ locale, namespace: 'pages.auth.forgotPassword.meta' })

  return {
    title: t('title'),
    description: t('description')
  }
}