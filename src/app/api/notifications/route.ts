import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DEFAULT_LOCALE, isSupportedLanguage } from '@/i18n/config'
import { getTranslations } from 'next-intl/server'

async function getAuthenticatedClient(req: NextRequest) {
  const localeCookie =
    req.cookies.get('NEXT_LOCALE')?.value ||
    req.cookies.get('spendly_locale')?.value ||
    DEFAULT_LOCALE
  const locale = isSupportedLanguage(localeCookie || '') ? (localeCookie as any) : DEFAULT_LOCALE
  const tErrors = await getTranslations({ locale, namespace: 'errors' })

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error(tErrors('auth.invalidAuthHeader'))
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
    throw new Error(tErrors('auth.notAuthenticated'))
  }
  return { supabase, user, locale }
}

// GET /api/notifications
export async function GET(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req)
    const tErrors = await getTranslations({ locale, namespace: 'errors' })

    const { searchParams } = new URL(req.url)
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query
    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: tErrors('notifications.fetchFailed') }, { status: 500 })
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

// POST /api/notifications
export async function POST(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req)
    const tErrors = await getTranslations({ locale, namespace: 'errors' })

    const body = await req.json()
    const { title, message, type = 'info', metadata = {} } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: tErrors('notifications.titleRequired') },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        title,
        message,
        type,
        metadata,
        is_read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return NextResponse.json({ error: tErrors('notifications.createFailed') }, { status: 500 })
    }

    return NextResponse.json({ notification: data }, { status: 201 })
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

// PATCH /api/notifications
export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req)
    const tErrors = await getTranslations({ locale, namespace: 'errors' })

    const body = await req.json()
    const { action, notification_ids } = body

    if (action === 'mark_all_read') {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        console.error('Error marking all as read:', error)
        return NextResponse.json({ error: tErrors('notifications.updateFailed') }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'mark_read' && notification_ids) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', notification_ids)

      if (error) {
        console.error('Error marking notifications as read:', error)
        return NextResponse.json({ error: tErrors('notifications.updateFailed') }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: tErrors('notifications.invalidAction') },
      { status: 400 }
    )
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