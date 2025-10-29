import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/serverSupabase'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { getTranslations } from 'next-intl/server'

// POST /api/notifications/queue - добавление уведомления в очередь
export async function POST(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req)
    const tErrors = await getTranslations({ locale, namespace: 'errors' })
    const tNotifications = await getTranslations({ locale, namespace: 'notifications' })

    const body = await req.json()
    const { notification_type = 'general', title, message, data = {}, action_url, send_push = true, send_email = false, scheduled_for, max_attempts = 3 } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: tErrors('notifications.titleRequired') },
        { status: 400 }
      )
    }

    // Добавляем уведомление в очередь
    const { data: queuedNotification, error } = await supabase
      .from('notification_queue')
      .insert({
        user_id: user.id,
        notification_type,
        title,
        message,
        data,
        action_url,
        send_push,
        send_email,
        scheduled_for: scheduled_for ? new Date(scheduled_for).toISOString() : null,
        status: 'pending',
        attempts: 0,
        max_attempts
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding notification to queue:', error)
      return NextResponse.json({ error: tErrors('notifications.queueAddFailed') }, { status: 500 })
    }

    // Если уведомление не запланировано на будущее, можно сразу вызвать Edge Function
    if (!scheduled_for || new Date(scheduled_for) <= new Date()) {
      try {
        // Вызываем Edge Function для немедленной обработки
        const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notifications`
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          console.warn('Edge Function call failed:', await response.text())
        }
      } catch (edgeError) {
        console.warn('Failed to trigger Edge Function:', edgeError)
        // Не возвращаем ошибку, так как уведомление всё равно добавлено в очередь
      }
    }

    return NextResponse.json({ 
      notification: queuedNotification,
      message: tNotifications('api.queueAdded')
    }, { status: 201 })

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

// GET /api/notifications/queue - получение статуса очереди уведомлений
export async function GET(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req)
    const tErrors = await getTranslations({ locale, namespace: 'errors' })

    const { searchParams } = new URL(req.url)
    
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = supabase
      .from('notification_queue')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching notification queue:', error)
      return NextResponse.json({ error: tErrors('notifications.queueFetchFailed') }, { status: 500 })
    }
    return NextResponse.json({ notifications: data })
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