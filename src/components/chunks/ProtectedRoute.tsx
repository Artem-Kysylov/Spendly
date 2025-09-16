'use client';

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserAuth } from '@/context/AuthContext'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = UserAuth()
  const router = useRouter()

  useEffect(() => {
    if (!session) {
      router.replace('/')
    }
  }, [session, router])

  if (!session) return null

  return children
}

export default ProtectedRoute