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

// GET /api/notifications/preferences - получение настроек уведомлений
export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Если настройки не найдены, создаем дефолтные
    if (!data) {
      const defaultSettings = {
        user_id: user.id,
        frequency: 'gentle' as const,
        push_enabled: false,
        email_enabled: true
      }

      const { data: newSettings, error: createError } = await supabase
        .from('notification_preferences')
        .insert(defaultSettings)
        .select()
        .single()

      if (createError) {
        console.error('Error creating default settings:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      return NextResponse.json({ settings: newSettings })
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/preferences - обновление настроек уведомлений
export async function PUT(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req)
    const body = await req.json()

    const {
      frequency,
      push_enabled,
      email_enabled
    } = body

    // Валидация
    const validFrequencies = ['disabled', 'gentle', 'aggressive', 'relentless']
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency value' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (frequency !== undefined) updateData.frequency = frequency
    if (push_enabled !== undefined) updateData.push_enabled = push_enabled
    if (email_enabled !== undefined) updateData.email_enabled = email_enabled

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('notification_preferences')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating notification settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}