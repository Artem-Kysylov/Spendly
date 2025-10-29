import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/serverSupabase'
import { normalizeLocaleSettings } from '@/i18n/detect'
import { isSupportedLanguage } from '@/i18n/config'

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)
    const body = await req.json()

    const datasetRes = await fetch(new URL('/data/countries-currencies-languages.json', req.url))
    const whitelist = await datasetRes.json() as Array<{ code: string; currency: string; language: string }>

    const requestedCountry = typeof body.country === 'string' ? body.country : undefined
    const requestedCurrency = typeof body.currency === 'string' ? body.currency : undefined
    const requestedLocale = typeof body.locale === 'string' && isSupportedLanguage(body.locale) ? body.locale : undefined

    const validCountry = requestedCountry && whitelist.some(c => c.code === requestedCountry) ? requestedCountry : undefined
    const validCurrency = requestedCurrency && whitelist.some(c => c.currency === requestedCurrency) ? requestedCurrency : undefined
    const validLocale = requestedLocale

    const normalized = normalizeLocaleSettings({
      country: validCountry,
      currency: validCurrency,
      locale: validLocale
    })

    // Пытаемся upsert в public.users (если таблица есть)
    const upsertRes = await supabase
      .from('users')
      .upsert(
        [{ id: user.id, country: normalized.country, currency: normalized.currency, locale: normalized.locale }],
        { onConflict: 'id' }
      )

    if (upsertRes.error) {
      // Если таблицы нет — мягко игнорируем, продолжаем с метаданными и куками
      const code = (upsertRes.error as any).code || ''
      const message = (upsertRes.error as any).message || ''
      const relationMissing = code === '42P01' || message.includes('relation "users" does not exist')
      if (!relationMissing) {
        console.warn('Upsert users failed:', upsertRes.error)
        // Не прерываем — продолжаем с метаданными и куками
      }
    }

    // Обновляем метаданные auth пользователя (совместимость)
    await supabase.auth.updateUser({
      data: {
        country: normalized.country,
        currency: normalized.currency,
        locale: normalized.locale
      }
    })

    const res = NextResponse.json({ success: true, settings: normalized })
    res.cookies.set('spendly_locale', normalized.locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    res.cookies.set('NEXT_LOCALE', normalized.locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    return res
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}