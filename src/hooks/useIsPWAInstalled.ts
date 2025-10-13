'use client'

import { useEffect, useState } from 'react'

export default function useIsPWAInstalled(): boolean {
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const check = () => {
      const mq = window.matchMedia('(display-mode: standalone)')
      const isStandalone = mq.matches || (window.navigator as any).standalone === true
      setIsInstalled(isStandalone)
    }
    check()

    const handleAppInstalled = () => setIsInstalled(true)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => window.removeEventListener('appinstalled', handleAppInstalled)
  }, [])

  return isInstalled
}