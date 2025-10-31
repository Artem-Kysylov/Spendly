import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Link } from '@/i18n/routing'
import { Label } from '@/components/ui/label'
import { ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import ForgotPasswordClient from './ForgotPasswordClient'

export default function Page() {
  return <ForgotPasswordClient />
}

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'pages.auth.forgotPassword.meta' })
  return {
    title: t('title'),
    description: t('description'),
  }
}
