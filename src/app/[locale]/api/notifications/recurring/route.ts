import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/serverSupabase'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { getTranslations } from 'next-intl/server'

type Cadence = 'weekly' | 'monthly'
const addCadence = (dateStr: string, cadence: Cadence): string => {
  const d = new Date(dateStr)
  if (cadence === 'weekly') d.setDate(d.getDate() + 7)
  else d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}
const dayDiff = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req)
    const tErrors = await getTranslations({ locale, namespace: 'errors' })
    const tNotifications = await getTranslations({ locale, namespace: 'notifications' })

    const today = new Date()
    const todayISO = today.toISOString().slice(0, 10)

    const { data: rules, error } = await supabase
      .from('recurring_rules')
      .select('id, title_pattern, avg_amount, cadence, next_due_date, budget_folder_id, active')
      .eq('user_id', user.id)
      .eq('active', true)

    if (error) {
      console.error('Error loading recurring_rules:', error)
      return NextResponse.json({ error: tErrors('notifications.fetchFailed') }, { status: 500 })
    }

    let dueTodayCount = 0
    let dueSoonCount = 0

    for (const r of (rules || [])) {
      const dueDate = new Date(r.next_due_date)
      const diff = dayDiff(dueDate, today) // positive => dueDate is after today
      // due today or overdue (diff <= 0)
      if (diff <= 0) {
        const title = tNotifications('recurring.dueTodayTitle', { name: r.title_pattern })
        const message = tNotifications('recurring.message', {
          date: r.next_due_date,
          amount: Number(r.avg_amount || 0).toFixed(2)
        })
        const { error: insErr } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title,
            message,
            type: 'weekly_reminder',
            metadata: {
              recurring_rule_id: r.id,
              due_date: r.next_due_date,
              budget_folder_id: r.budget_folder_id ?? null
            },
            is_read: false
          })
        if (!insErr) {
          dueTodayCount++
          // shift next_due_date forward
          const next = addCadence(r.next_due_date, r.cadence)
          await supabase
            .from('recurring_rules')
            .update({ next_due_date: next, updated_at: new Date().toISOString() })
            .eq('id', r.id)
            .eq('user_id', user.id)
        } else {
          console.warn('Insert notification failed:', insErr)
        }
      } else if (diff <= 3) {
        const title = tNotifications('recurring.dueSoonTitle', { name: r.title_pattern })
        const message = tNotifications('recurring.message', {
          date: r.next_due_date,
          amount: Number(r.avg_amount || 0).toFixed(2)
        })
        const { error: insErr } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title,
            message,
            type: 'weekly_reminder',
            metadata: {
              recurring_rule_id: r.id,
              due_date: r.next_due_date,
              budget_folder_id: r.budget_folder_id ?? null,
              soon: true
            },
            is_read: false
          })
        if (!insErr) dueSoonCount++
      }
    }

    return NextResponse.json({ inserted: { dueToday: dueTodayCount, dueSoon: dueSoonCount }, date: todayISO })
  } catch (error) {
    const localeCookie =
      req.cookies.get('NEXT_LOCALE')?.value ||
      req.cookies.get('spendly_locale')?.value ||
      DEFAULT_LOCALE
    const locale = isSupportedLanguage(localeCookie || '') ? (localeCookie as any) : DEFAULT_LOCALE
    const tErrors = await getTranslations({ locale, namespace: 'errors' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : tErrors('common.internalServerError') },
      { status: 500 }
    )
  }
}