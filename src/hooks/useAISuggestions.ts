'use client'

import { useState, useCallback } from 'react'
import { UserAuth } from '@/context/AuthContext'

export function useAISuggestions() {
  const { session } = UserAuth()
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState<boolean>(false)

  const fetchSuggestion = useCallback(async (prompt: string) => {
    if (!session?.user?.id) return
    setText('')
    setLoading(true)
    setError(null)
    setIsRateLimited(false)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          isPro: false,
          enableLimits: true,
          message: prompt
        })
      })

      if (!res.ok) {
        if (res.status === 429) {
          setIsRateLimited(true)
          setError('Rate limit reached. Please try again later.')
          return
        }
        const ct = res.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const json = await res.json()
          setError(json.error || 'Failed to fetch suggestion')
          return
        }
        setError('Failed to fetch suggestion')
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setText(acc)
      }
    } catch (e) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  return { text, loading, error, isRateLimited, fetchSuggestion }
}