import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/serverSupabase'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { getTranslations } from 'next-intl/server'

// POST /api/notifications/subscribe - подписка на push-уведомления
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)
    const body = await req.json()

    const localeCookie =
      req.cookies.get('NEXT_LOCALE')?.value ||
      req.cookies.get('spendly_locale')?.value ||
      DEFAULT_LOCALE
    const locale = isSupportedLanguage(localeCookie || '') ? (localeCookie as any) : DEFAULT_LOCALE
    const tErrors = await getTranslations({ locale, namespace: 'errors' })
    const tNotifications = await getTranslations({ locale, namespace: 'notifications' })

    const { subscription } = body

    // Валидация входных данных
    const endpoint: unknown = subscription?.endpoint
    const p256dh: unknown = subscription?.keys?.p256dh
    const auth: unknown = subscription?.keys?.auth

    const isNonEmptyString = (v: unknown) => typeof v === 'string' && v.trim().length > 0
    if (!isNonEmptyString(endpoint) || !isNonEmptyString(p256dh) || !isNonEmptyString(auth)) {
      return NextResponse.json(
        { error: tErrors('notifications.subscriptionInvalid') },
        { status: 400 }
      )
    }
    try {
      // валидируем, что endpoint — корректный URL
      new URL(endpoint as string)
    } catch {
      return NextResponse.json(
        { error: tErrors('notifications.subscriptionInvalid') },
        { status: 400 }
      )
    }

    const userAgent = req.headers.get('user-agent') || 'Unknown'

    // Поиск существующей записи по (user_id, endpoint)
    const { data: existing, error: existingErr } = await supabase
      .from('notification_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', endpoint as string)
      .single()

    let targetId: string | null = null

    if (existingErr && (existingErr as any).code === 'PGRST116') {
      // Нет записи — вставляем
      const { data: inserted, error: insertErr } = await supabase
        .from('notification_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: endpoint as string,
          p256dh_key: p256dh as string,
          auth_key: auth as string,
          user_agent: userAgent,
          is_active: true
        })
        .select('id')
        .single()

      if (insertErr) {
        console.error('Error saving push subscription (insert):', insertErr)
        return NextResponse.json({ error: tErrors('notifications.subscriptionSaveFailed') }, { status: 500 })
      }
      targetId = inserted.id
    } else if (existingErr) {
      console.error('Error querying subscription:', existingErr)
      return NextResponse.json({ error: tErrors('notifications.subscriptionSaveFailed') }, { status: 500 })
    } else {
      // Обновляем существующую запись
      const { data: updated, error: updateErr } = await supabase
        .from('notification_subscriptions')
        .update({
          p256dh_key: p256dh as string,
          auth_key: auth as string,
          user_agent: userAgent,
          is_active: true
        })
        .eq('id', existing!.id)
        .select('id')
        .single()

      if (updateErr) {
        console.error('Error saving push subscription (update):', updateErr)
        return NextResponse.json({ error: tErrors('notifications.subscriptionSaveFailed') }, { status: 500 })
      }
      targetId = updated.id
    }

    // Деактивируем дубликаты с тем же endpoint у этого пользователя
    if (targetId) {
      const { error: dupErr } = await supabase
        .from('notification_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('endpoint', endpoint as string)
        .neq('id', targetId)

      if (dupErr) {
        console.warn('Duplicate deactivation warning:', dupErr)
      }
    }

    // Обновляем настройки (включаем push)
    const { error: settingsError } = await supabase
      .from('notification_preferences')
      .update({ push_enabled: true })
      .eq('user_id', user.id)
    if (settingsError) {
      console.error('Error updating push settings:', settingsError)
    }

    return NextResponse.json({ success: true, message: tNotifications('api.subscriptionSaved') })
  } catch (error) {
    console.error('API Error:', error)
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

// DELETE /api/notifications/subscribe - отписка от push-уведомлений
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)
    const body = await req.json()

    const localeCookie =
      req.cookies.get('NEXT_LOCALE')?.value ||
      req.cookies.get('spendly_locale')?.value ||
      DEFAULT_LOCALE
    const locale = isSupportedLanguage(localeCookie || '') ? (localeCookie as any) : DEFAULT_LOCALE
    const tErrors = await getTranslations({ locale, namespace: 'errors' })
    const tNotifications = await getTranslations({ locale, namespace: 'notifications' })

    const { endpoint } = body

    if (endpoint) {
      // Деактивируем конкретную подписку
      const { error } = await supabase
        .from('notification_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)

      if (error) {
        console.error('Error deactivating push subscription:', error)
        return NextResponse.json({ error: tErrors('notifications.deactivateFailed') }, { status: 500 })
      }
    } else {
      // Деактивируем все подписки пользователя
      const { error } = await supabase
        .from('notification_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deactivating all push subscriptions:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    // Обновляем настройки пользователя (таблица notification_preferences)
    const { error: settingsError } = await supabase
      .from('notification_preferences')
      .update({ push_enabled: false })
      .eq('user_id', user.id)

    if (settingsError) {
      console.error('Error updating push settings:', settingsError)
    }

    return NextResponse.json({ success: true, message: tNotifications('api.subscriptionRemoved') })
  } catch (error) {
    console.error('API Error:', error)
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