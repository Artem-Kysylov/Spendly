'use client'

import { useEffect } from 'react'

const ServiceWorkerRegistration = () => {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    console.log('SW registered: ', registration)
                })
                .catch((registrationError) => {
                    console.log('SW registration failed: ', registrationError)
                })
        }
    }, [])

    return null
}

export default ServiceWorkerRegistration