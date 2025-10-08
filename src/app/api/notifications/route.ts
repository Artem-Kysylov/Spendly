import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/serverSupabase'
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

// GET /api/notifications - получение уведомлений пользователя
export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notifications: data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - создание нового уведомления
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)
    const body = await req.json()

    const { title, message, type = 'info', metadata = {} } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ notification: data }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications - массовое обновление уведомлений
export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)
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
        return NextResponse.json({ error: error.message }, { status: 500 })
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
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    )
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}