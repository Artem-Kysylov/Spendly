import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Получение клиента с аутентификацией пользователя
async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.substring(7)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  // Проверяем аутентификацию
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('User not authenticated')
  }

  return { supabase, user }
}

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

    // Сохраняем подписку в базе данных
    const { error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
        user_agent: req.headers.get('user-agent') || 'Unknown'
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
      // Подписка сохранена, так что ошибку не пробрасываем
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
      // Удаляем конкретную подписку
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)

      if (error) {
        console.error('Error removing push subscription:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      // Удаляем все подписки пользователя
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Error removing all push subscriptions:', error)
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