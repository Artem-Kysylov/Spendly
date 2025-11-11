import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/serverSupabase'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { getWeekRange, getLastWeekRange } from '@/lib/ai/stats'

function isAuthorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization') || ''
  const cronSecret = req.headers.get('x-cron-secret') ?? ''
  const okByBearer = bearer.startsWith('Bearer ')
      ? bearer.slice(7) === (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
      : false
  // ВСЕГДА boolean: есть CRON_SECRET и заголовок совпадает
  const okBySecret = !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET

  return okByBearer || okBySecret
}

function formatCurrency(n: number, locale: string, currency: string) {
  try {
    return new Intl.NumberFormat(locale || 'en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(n || 0)
  } catch {
    return `$${Math.round(n || 0)}`
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabaseClient()
  const localeCookie =
    req.cookies.get('NEXT_LOCALE')?.value ||
    req.cookies.get('spendly_locale')?.value ||
    DEFAULT_LOCALE
  const locale = isSupportedLanguage(localeCookie || '') ? (localeCookie as any) : DEFAULT_LOCALE
  const currency = 'USD' // Можно расширить и брать из профиля

  // Точки недели: текущая неделя (старт в понедельник) и прошлые периоды
  const { start: thisWeekStart } = getWeekRange(new Date())
  const { start: lastWeekStart, end: lastWeekEnd } = getLastWeekRange(thisWeekStart)
  const { start: prevWeekStart, end: prevWeekEnd } = getLastWeekRange(lastWeekStart)

  // 1) Выбираем активных пользователей по preferences
  const { data: prefs, error: prefsErr } = await supabase
    .from('notification_preferences')
    .select('user_id, engagement_frequency, push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone')
    .neq('engagement_frequency', 'disabled')

  if (prefsErr) {
    console.error('digest: preferences error', prefsErr)
    return NextResponse.json(
      {
        error: 'Failed to fetch preferences',
      },
      { status: 500 },
    )
  }

  const targets = (prefs || []).filter(p => p.push_enabled || p.email_enabled)
  let created = 0
  let skipped = 0

  for (const p of targets) {
    const userId = p.user_id

    // Идемпотентность: проверяем, не создавали ли дайджест за эту прошлую неделю
    const idemKey = `weekly:${userId}:${lastWeekStart.toISOString().slice(0, 10)}`
    const { data: existing } = await supabase
      .from('notification_queue')
      .select('id')
      .eq('user_id', userId)
      .eq('notification_type', 'weekly_reminder')
      .gte('created_at', lastWeekStart.toISOString())
      .lte('created_at', lastWeekEnd.toISOString())
      .limit(1)

    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    // Берём транзакции за прошлую и позапрошлую недели
    const { data: lastWeekTxs, error: lastErr } = await supabase
      .from('transactions')
      .select(`
        id, title, amount, type, created_at, budget_folder_id,
        budget_folders ( name, emoji )
      `)
      .eq('user_id', userId)
      .gte('created_at', lastWeekStart.toISOString())
      .lte('created_at', lastWeekEnd.toISOString())

    if (lastErr) {
      console.warn('digest: lastWeek tx error', lastErr)
      skipped++
      continue
    }

    const { data: prevWeekTxs, error: prevErr } = await supabase
      .from('transactions')
      .select('id, title, amount, type, created_at, budget_folder_id')
      .eq('user_id', userId)
      .gte('created_at', prevWeekStart.toISOString())
      .lte('created_at', prevWeekEnd.toISOString())

    if (prevErr) {
      console.warn('digest: prevWeek tx error', prevErr)
    }

    const totalExpensesLast = (lastWeekTxs || []).filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
    const totalIncomeLast = (lastWeekTxs || []).filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)

    const totalExpensesPrev = (prevWeekTxs || []).filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
    const totalIncomePrev = (prevWeekTxs || []).filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)

    // Топ‑категории (по расходам)
    const byBudget = new Map<string, number>()
    for (const t of (lastWeekTxs || [])) {
      if (t.type !== 'expense') continue
      const name = (Array.isArray(t.budget_folders) ? t.budget_folders[0]?.name : (t as any)?.budget_folders?.name) || 'Unassigned'
      byBudget.set(name, (byBudget.get(name) || 0) + (t.amount || 0))
    }
    const topBudgets = Array.from(byBudget.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    // Формируем контент
    const title = locale === 'ru' ? 'Еженедельный дайджест' : locale === 'id' ? 'Ringkasan Mingguan' : 'Weekly Digest'
    const body =
      `${locale === 'ru' ? 'За прошлую неделю' : locale === 'id' ? 'Minggu lalu' : 'Last week'} — `
      + `${locale === 'ru' ? 'Расходы' : locale === 'id' ? 'Pengeluaran' : 'Expenses'} ${formatCurrency(totalExpensesLast, locale, currency)}, `
      + `${locale === 'ru' ? 'Доходы' : locale === 'id' ? 'Pendapatan' : 'Income'} ${formatCurrency(totalIncomeLast, locale, currency)}. `
      + (topBudgets.length
        ? `${locale === 'ru' ? 'Топ:' : locale === 'id' ? 'Top:' : 'Top:'} ${topBudgets.map(([n, v]) => `${n} ${formatCurrency(v, locale, currency)}`).join(', ')}.`
        : '')

    const actionUrl = '/dashboard?view=report&period=lastWeek'
    const deepLink = actionUrl

    // In‑app уведомление c metadata
    const { error: notifErr } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message: body,
        type: 'weekly_reminder',
        metadata: {
          week_start: lastWeekStart.toISOString().slice(0, 10),
          transactions_count: (lastWeekTxs || []).length,
          total_spent: totalExpensesLast,
          currency,
          deepLink
        },
        is_read: false,
      })
    if (notifErr) {
      console.warn('digest: notif insert error', notifErr)
    }

    // Тихие часы: перенести scheduled_for на ближайшее разрешённое время
    const computeNextAllowedTime = (now: Date, pref: any) => {
      if (!pref?.quiet_hours_enabled || !pref?.quiet_hours_start || !pref?.quiet_hours_end) return now
      const [sh, sm] = String(pref.quiet_hours_start).split(':').map((x: string) => parseInt(x, 10))
      const [eh, em] = String(pref.quiet_hours_end).split(':').map((x: string) => parseInt(x, 10))
      const nowMin = now.getHours() * 60 + now.getMinutes()
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em
      const inQuiet = startMin < endMin ? (nowMin >= startMin && nowMin < endMin) : (nowMin >= startMin || nowMin < endMin)
      if (!inQuiet) return now
      const next = new Date(now)
      if (startMin < endMin) {
        next.setHours(eh, em, 0, 0)
      } else {
        next.setDate(next.getDate() + (nowMin >= startMin ? 1 : 0))
        next.setHours(eh, em, 0, 0)
      }
      return next
    }

    const scheduledAt = computeNextAllowedTime(new Date(), p).toISOString()

    // Задача в очередь + игнор дублей
    const { error: queueErr } = await supabase
      .from('notification_queue')
      .insert({
        user_id: userId,
        notification_type: 'weekly_reminder',
        title,
        message: body,
        data: { deepLink, tag: 'weekly_reminder', renotify: true, idempotent_key: idemKey },
        action_url: actionUrl,
        send_push: !!p.push_enabled,
        send_email: !!p.email_enabled,
        scheduled_for: scheduledAt,
        status: 'pending',
        attempts: 0,
        max_attempts: 3
      })

    if (queueErr) {
      if (String((queueErr as any).code) === '23505') {
        // Конфликт уникальности — игнорируем
        skipped++
        continue
      }
      console.warn('digest: queue insert error', queueErr)
      skipped++
      continue
    }

    created++
  }

  return NextResponse.json({ ok: true, created, skipped, period: { lastWeekStart, lastWeekEnd } })
}