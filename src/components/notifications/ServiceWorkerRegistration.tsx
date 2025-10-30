'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useLocale } from 'next-intl'

const ServiceWorkerRegistration = () => {
    const locale = useLocale()

    // Хелпер для VAPID
    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = typeof window !== 'undefined'
            ? window.atob(base64)
            : Buffer.from(base64, 'base64').toString('binary')
        const outputArray = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }

    useEffect(() => {
        // Регистрируем SW только в production и после полной загрузки страницы
        if (process.env.NODE_ENV !== 'production') return

        if ('serviceWorker' in navigator) {
            const onLoad = () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('SW registered: ', registration)
                    })
                    .catch((registrationError) => {
                        console.log('SW registration failed: ', registrationError)
                    })
            }

            const resubscribe = async () => {
                try {
                    const registration = await navigator.serviceWorker.ready
                    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                    if (!vapid) return
                    const applicationServerKey = urlBase64ToUint8Array(vapid)

                    // создать/обновить подписку
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey
                    })

                    // сохранить на сервере от имени пользователя
                    const { data: { session } } = await supabase.auth.getSession()
                    const token = session?.access_token
                    if (!token) return

                    await fetch(`/${locale}/api/notifications/subscribe`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ subscription })
                    })
                    console.log('Push re-subscribed successfully after change')
                } catch (e) {
                    console.warn('Re-subscribe failed:', e)
                }
            }

            const ensureActiveSubscription = async () => {
                try {
                    const registration = await navigator.serviceWorker.ready
                    const current = await registration.pushManager.getSubscription()
                    if (current) return

                    const { data: { session } } = await supabase.auth.getSession()
                    const token = session?.access_token
                    if (!token) return

                    const prefsRes = await fetch(`/${locale}/api/notifications/preferences`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (!prefsRes.ok) return
                    const { settings } = await prefsRes.json()
                    if (settings?.push_enabled) {
                        await resubscribe()
                    }
                } catch {}
            }

            const onMessage = (event: MessageEvent) => {
                if (event?.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
                    resubscribe()
                }
            }

            window.addEventListener('load', onLoad)
            navigator.serviceWorker.addEventListener('message', onMessage)

            // Фоновая проверка после инициализации
            ensureActiveSubscription()

            return () => {
                window.removeEventListener('load', onLoad)
                navigator.serviceWorker.removeEventListener('message', onMessage)
            }
        }
    }, [locale])

    return null
}

export default ServiceWorkerRegistration