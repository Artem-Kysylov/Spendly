import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/serverSupabase'
import webpush from 'web-push'

function isAuthorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization') || ''
  const cronSecret = req.headers.get('x-cron-secret') ?? ''
  const okByBearer = bearer.startsWith('Bearer ')
    ? bearer.slice(7) === (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
    : false

  const okBySecret = !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET

  return okByBearer || okBySecret
}

function backoffDelayMs(attempts: number) {
  // 1m, 2m, 4m ...
  const base = 60_000
  const pow = Math.max(0, attempts - 1)
  return base * Math.pow(2, pow)
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServerSupabaseClient()
  const nowIso = new Date().toISOString()

  const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || ''
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: 'Missing VAPID keys' }, { status: 500 })
  }
  webpush.setVapidDetails('mailto:admin@example.com', vapidPublic, vapidPrivate)

  // Загружаем pending задачи
  const { data: tasks, error: tasksErr } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', nowIso)
    .order('created_at', { ascending: true })
    .limit(100)

  if (tasksErr) {
    console.error('processor: queue select error', tasksErr)
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
  }

  let processed = 0
  let sent = 0
  let failed = 0

  for (const task of tasks || []) {
    // Получаем активные подписки пользователя
    const { data: subs, error: subsErr } = await supabase
      .from('notification_subscriptions')
      .select('id, endpoint, p256dh_key, auth_key, is_active')
      .eq('user_id', task.user_id)
      .eq('is_active', true)

    if (subsErr) {
      console.warn('processor: subs error', subsErr)
    }

    let anySuccess = false
    const payload = JSON.stringify({
      title: task.title || 'Spendly',
      body: task.message || 'Notification',
      tag: task.data?.tag || 'spendly',
      renotify: !!task.data?.renotify,
      badge: task.data?.badge || '/icons/icon-192x192.png',
      data: {
        deepLink: task.data?.deepLink || '/dashboard'
      }
    })

    for (const sub of subs || []) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key }
        } as any, payload)
        anySuccess = true
        // Небольшая пауза для глобального лимита
        await new Promise(res => setTimeout(res, 100))
      } catch (err: any) {
        const code = Number(err?.statusCode || err?.status || 0)
        if ([410, 404, 403].includes(code)) {
          // Деактивируем битую подписку
          await supabase
            .from('notification_subscriptions')
            .update({ is_active: false })
            .eq('id', sub.id)
        }
        // Не ретраим конкретную подписку, переходим к следующей
        console.warn('webpush error', code, err?.body || err?.message || '')
      }
    }

    const attempts = Number(task.attempts || 0) + 1
    if (anySuccess) {
      await supabase
        .from('notification_queue')
        .update({ status: 'sent', attempts })
        .eq('id', task.id)
      sent++
    } else {
      if (attempts >= Number(task.max_attempts || 3)) {
        await supabase
          .from('notification_queue')
          .update({ status: 'failed', attempts })
          .eq('id', task.id)
        failed++
      } else {
        const delay = backoffDelayMs(attempts)
        const nextTime = new Date(Date.now() + delay).toISOString()
        await supabase
          .from('notification_queue')
          .update({ status: 'pending', attempts, scheduled_for: nextTime })
          .eq('id', task.id)
      }
    }
    processed++
  }

  return NextResponse.json({ ok: true, processed, sent, failed })
}