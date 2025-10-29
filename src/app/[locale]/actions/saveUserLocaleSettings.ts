'use server'

import { cookies } from 'next/headers'
import { getServerSupabaseClient } from '@/lib/serverSupabase'
import { normalizeLocaleSettings } from '@/i18n/detect'
import { isSupportedLanguage } from '@/i18n/config'
import fs from 'fs'
import path from 'path'

type SaveUserLocalePayload = {
  userId: string
  country?: string
  currency?: string
  locale?: string
}

export async function saveUserLocaleSettings(payload: SaveUserLocalePayload) {
  const { userId, country, currency, locale } = payload
  if (!userId) throw new Error('Missing userId')

  const datasetPath = path.join(process.cwd(), 'public', 'data', 'countries-currencies-languages.json')
  const raw = fs.readFileSync(datasetPath, 'utf8')
  const whitelist: Array<{ code: string; currency: string; language: string }> = JSON.parse(raw)

  const validCountry = country && whitelist.some(c => c.code === country) ? country : undefined
  const validCurrency = currency && whitelist.some(c => c.currency === currency) ? currency : undefined
  const validLocale = (locale && isSupportedLanguage(locale)) ? locale : undefined

  const normalized = normalizeLocaleSettings({ country: validCountry, currency: validCurrency, locale: validLocale })

  const supabase = getServerSupabaseClient()

  try {
    const { error } = await supabase
      .from('users')
      .upsert(
        [{ id: userId, country: normalized.country, currency: normalized.currency, locale: normalized.locale }],
        { onConflict: 'id' }
      )

    if (error) {
      const code = (error as any).code || ''
      const message = (error as any).message || ''
      const relationMissing = code === '42P01' || message.includes('relation "users" does not exist')
      if (!relationMissing) {
        throw new Error(error.message)
      }
      // Таблицы нет — игнорируем, перейдём на куки
      console.warn('users table missing, skipping DB save; using cookies only')
    }
  } catch (e: any) {
    const msg = e?.message || String(e)
    if (!msg.includes('relation "users" does not exist')) throw e
    console.warn('users table missing, skipping DB save; using cookies only')
  }

  // Set cookies for client/provider sync
  const cookieStore = cookies()
  cookieStore.set('spendly_locale', normalized.locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })
  cookieStore.set('NEXT_LOCALE', normalized.locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })

  return { success: true, settings: normalized }
}