'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import type { Notification, UseNotificationsReturn } from '@/types/types'
import { useLocale } from 'next-intl'

export const useNotifications = (): UseNotificationsReturn => {
    const { session } = UserAuth()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const locale = useLocale()
    const apiBase = `/${locale}/api/notifications`

    // Получение токена для API запросов
    const getAuthToken = useCallback(async () => {
        if (!session) return null
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        return currentSession?.access_token || null
    }, [session])

    const fetchNotifications = useCallback(async (limit = 50, offset = 0, unreadOnly = false) => {
        if (!session?.user?.id) return

        try {
            setIsLoading(true)
            setError(null)

            const token = await getAuthToken()
            if (!token) {
                throw new Error('No auth token available')
            }

            const params = new URLSearchParams({
                limit: limit.toString(),
                offset: offset.toString(),
                unread_only: unreadOnly.toString()
            })

            const response = await fetch(`${apiBase}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error((errorData as any).error || 'Failed to fetch notifications')
            }

            const { notifications: fetchedNotifications } = await response.json()
            setNotifications(fetchedNotifications || [])
        } catch (err) {
            console.error('Error fetching notifications:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
        } finally {
            setIsLoading(false)
        }
    }, [session?.user?.id, getAuthToken, apiBase])

    const markAsRead = useCallback(async (id: string) => {
        if (!session?.user?.id) return

        try {
            const token = await getAuthToken()
            if (!token) {
                throw new Error('No auth token available')
            }

            const response = await fetch(`${apiBase}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'mark_read',
                    notification_ids: [id]
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error((errorData as any).error || 'Failed to mark notification as read')
            }

            // Обновляем локальное состояние
            setNotifications(prev => 
                prev.map(notification => 
                    notification.id === id 
                        ? { ...notification, is_read: true }
                        : notification
                )
            )
        } catch (err) {
            console.error('Error marking notification as read:', err)
        }
    }, [session?.user?.id, getAuthToken, apiBase])

    const markAllAsRead = useCallback(async () => {
        if (!session?.user?.id) return

        try {
            const token = await getAuthToken()
            if (!token) {
                throw new Error('No auth token available')
            }

            const response = await fetch(`${apiBase}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'mark_all_read'
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error((errorData as any).error || 'Failed to mark all notifications as read')
            }

            // Обновляем локальное состояние
            setNotifications(prev => 
                prev.map(notification => ({ ...notification, is_read: true }))
            )
        } catch (err) {
            console.error('Error marking all notifications as read:', err)
        }
    }, [session?.user?.id, getAuthToken, apiBase])

    const createNotification = useCallback(async (notificationData: {
        title: string
        message: string
        type?: 'info' | 'success' | 'warning' | 'error'
        metadata?: Record<string, any>
    }) => {
        if (!session?.user?.id) return

        try {
            const token = await getAuthToken()
            if (!token) {
                throw new Error('No auth token available')
            }

            const response = await fetch(`${apiBase}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error((errorData as any).error || 'Failed to create notification')
            }

            const { notification } = await response.json()
            
            // Добавляем новое уведомление в начало списка
            setNotifications(prev => [notification, ...prev])
            
            return notification
        } catch (err) {
            console.error('Error creating notification:', err)
            throw err
        }
    }, [session?.user?.id, getAuthToken, apiBase])

    const unreadCount = notifications.filter(n => !n.is_read).length

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    // Real-time subscription для получения новых уведомлений
    useEffect(() => {
        if (!session?.user?.id) return

        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${session.user.id}`
                },
                (payload) => {
                    console.log('Real-time notification update:', payload)
                    // Перезагружаем уведомления при изменениях
                    fetchNotifications()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [session?.user?.id, fetchNotifications])

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        createNotification,
        refetch: fetchNotifications
    }
}