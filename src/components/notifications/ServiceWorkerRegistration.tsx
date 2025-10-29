'use client'

import { useEffect } from 'react'

const ServiceWorkerRegistration = () => {
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
            window.addEventListener('load', onLoad)
            return () => window.removeEventListener('load', onLoad)
        }
    }, [])

    return null
}

export default ServiceWorkerRegistration