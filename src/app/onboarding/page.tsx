'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserAuth } from '@/context/AuthContext'

import Onboarding from '@/components/onboarding/Onboarding'

export default function Page() {
  const { session, isReady } = UserAuth()
  const router = useRouter()

  useEffect(() => {
    if (isReady && session?.user?.user_metadata?.onboarding_completed) {
      router.replace('/dashboard')
    }
  }, [isReady, session, router])

  // Принудительно убираем тёмную тему (как на / (auth))
  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])
  return (
    <div
      className="auth-light min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/Sign up screen-bg.png')" }}
    >
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <Onboarding />
      </div>
    </div>
  )
}