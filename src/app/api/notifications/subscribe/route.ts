import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/serverSupabase'

// POST /api/notifications/subscribe - подписка на push-уведомления
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)
    const body = await req.json()

    const { subscription } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Valid push subscription is required' },
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
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 })
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/subscribe - отписка от push-уведомлений
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)
    const body = await req.json()

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
        return NextResponse.json({ error: error.message }, { status: 500 })
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}