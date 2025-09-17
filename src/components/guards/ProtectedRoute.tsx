'use client';

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserAuth } from '@/context/AuthContext'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isReady } = UserAuth()
  const router = useRouter()

  useEffect(() => {
    if (isReady && !session) {
      router.replace('/')
    }
  }, [isReady, session, router])

  if (!isReady) return null
  if (!session) return null

  return children
}

export default ProtectedRoute