'use client';

import { useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { UserAuth } from '@/context/AuthContext'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isReady } = UserAuth()
  const router = useRouter()

  useEffect(() => {
    if (isReady && !session) {
      router.replace('/')
    }
  }, [isReady, session, router])

  return children
}

export default ProtectedRoute