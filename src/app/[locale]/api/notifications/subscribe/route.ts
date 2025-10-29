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

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: tErrors('notifications.subscriptionInvalid') },
        { status: 400 }
      )
    }

    // Сохраняем подписку в базе данных (обновленное название таблицы)
    const { error: subscriptionError } = await supabase
      .from('notification_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys?.p256dh,
        auth_key: subscription.keys?.auth,
        user_agent: req.headers.get('user-agent') || 'Unknown',
        is_active: true
      })

    if (subscriptionError) {
      console.error('Error saving push subscription:', subscriptionError)
      return NextResponse.json({ error: tErrors('notifications.subscriptionSaveFailed') }, { status: 500 })
    }

    // Обновляем настройки пользователя (таблица notification_preferences)
    const { error: settingsError } = await supabase
      .from('notification_preferences')
      .update({ push_enabled: true })
      .eq('user_id', user.id)

    if (settingsError) {
      console.error('Error updating push settings:', settingsError)
      // Не возвращаем ошибку, так как подписка уже сохранена
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