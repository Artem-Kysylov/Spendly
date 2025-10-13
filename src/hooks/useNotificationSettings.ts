'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import type { NotificationSettings, UseNotificationSettingsReturn } from '@/types/types'

export const useNotificationSettings = (): UseNotificationSettingsReturn => {
    const { session, isReady } = UserAuth()
    const [settings, setSettings] = useState<NotificationSettings | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Получение токена для API запросов
    const getAuthToken = useCallback(async () => {
        if (!session) return null
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        return currentSession?.access_token || null
    }, [session])

    const fetchSettings = useCallback(async () => {
        // Ждем готовности контекста аутентификации
        if (!isReady) {
            return
        }

        if (!session?.user?.id) {
            console.log('No user session found')
            setError('Пользователь не аутентифицирован. Войдите в систему для доступа к настройкам уведомлений.')
            setIsLoading(false)
            return
        }

        try {
            setIsLoading(true)
            setError(null)
            console.log('Fetching notification settings for user:', session.user.id)

            const token = await getAuthToken()
            if (!token) {
                throw new Error('No auth token available')
            }

            const response = await fetch('/api/notifications/preferences', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to fetch settings')
            }

            const { settings: fetchedSettings } = await response.json()
            console.log('Settings fetched via API:', fetchedSettings)
            setSettings(fetchedSettings)
        } catch (err) {
            console.error('Error fetching notification settings:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch settings')
        } finally {
            setIsLoading(false)
        }
    }, [session?.user?.id, isReady, getAuthToken])

    const updateSettings = useCallback(async (updates: Partial<NotificationSettings>) => {
        if (!session?.user?.id || !settings) return

        const prev = settings
        try {
            // Оптимистичное обновление UI
            setSettings({ ...prev, ...updates })

            const token = await getAuthToken()
            if (!token) {
                setSettings(prev)
                throw new Error('No auth token available')
            }

            const response = await fetch('/api/notifications/preferences', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    frequency: updates.frequency ?? prev.frequency,
                    push_enabled: updates.push_enabled ?? prev.push_enabled,
                    email_enabled: updates.email_enabled ?? prev.email_enabled
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                setSettings(prev)
                throw new Error(errorData.error || 'Failed to update settings')
            }

            const { settings: updated } = await response.json()
            setSettings(updated as NotificationSettings)
        } catch (err) {
            console.error('Error updating notification settings:', err)
            throw err
        }
    }, [session?.user?.id, settings, getAuthToken])

    const subscribeToPush = useCallback(async (): Promise<boolean> => {
        // Optimistic on
        const prev = settings
        if (settings) {
            setSettings({ ...settings, push_enabled: true })
        }

        // Проверка поддержки
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported')
            if (prev) setSettings(prev)
            return false
        }

        try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                console.warn('Push notification permission denied')
                if (prev) setSettings(prev)
                return false
            }

            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            })

            const token = await getAuthToken()
            if (!token) {
                if (prev) setSettings(prev)
                throw new Error('No auth token available')
            }

            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ subscription })
            })

            if (!response.ok) {
                const errorData = await response.json()
                if (prev) setSettings(prev)
                throw new Error(errorData.error || 'Failed to save push subscription')
            }

            console.log('Push subscription saved successfully')
            return true
        } catch (err) {
            console.error('Error subscribing to push notifications:', err)
            if (prev) setSettings(prev)
            return false
        }
    }, [getAuthToken, settings])

    const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
        // Optimistic off
        const prev = settings
        if (settings) {
            setSettings({ ...settings, push_enabled: false })
        }

        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            
            if (subscription) {
                await subscription.unsubscribe()
                
                const token = await getAuthToken()
                if (!token) {
                    if (prev) setSettings(prev)
                    throw new Error('No auth token available')
                }

                const response = await fetch('/api/notifications/subscribe', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                })

                if (!response.ok) {
                    const errorData = await response.json()
                    if (prev) setSettings(prev)
                    throw new Error(errorData.error || 'Failed to remove push subscription')
                }

                console.log('Push subscription removed successfully')
            }

            return true
        } catch (err) {
            console.error('Error unsubscribing from push notifications:', err)
            if (prev) setSettings(prev)
            return false
        }
    }, [getAuthToken, settings])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    return {
        settings,
        isLoading,
        error,
        updateSettings,
        subscribeToPush,
        unsubscribeFromPush
    }
}