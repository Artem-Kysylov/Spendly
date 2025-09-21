'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import Button from '@/components/ui-elements/Button'
import { CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<'form' | 'success'>('form')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Базовая валидация email
    const isValid = /\S+@\S+\.\S+/.test(email)
    if (!isValid) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setIsSubmitting(true)
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      // Независимо от результата показываем success-экран,
      // чтобы не раскрывать наличие/отсутствие аккаунта.
      setStage('success')
    } catch (err: any) {
      // Техническая ошибка — покажем пользователю
      setError(err?.message ?? 'Something went wrong, please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/Sign up screen-bg.png')" }}
    >
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-[10px] border border-gray-200 bg-white text-gray-900 shadow-sm dark:bg-white dark:text-gray-900">
          <div className="p-6 sm:p-8">
            <div className="flex justify-center">
              <Image src="/Spendly-logo.svg" alt="Spendly" width={120} height={32} priority />
            </div>

            <h1 className="mt-6 mb-4 text-2xl font-semibold text-center">
              Forgot your password
            </h1>

            {stage === 'form' && (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <p className="text-sm text-gray-600">
                  Enter your email address and we’ll send you a link to reset your password.
                  After sending, please check your inbox and the Spam folder.
                </p>

                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                  />
                </div>

                {error && (
                  <div role="alert" aria-live="polite" className="text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  text={isSubmitting ? 'Sending...' : 'Send reset link'}
                  disabled={isSubmitting}
                />

                <div className="text-center">
                  <Link href="/" className="text-blue-600 hover:text-blue-700 underline text-sm">
                    Back to Sign in
                  </Link>
                </div>
              </form>
            )}

            {stage === 'success' && (
              <div className="flex flex-col items-center text-center space-y-4" aria-live="polite">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" aria-hidden="true" />
                <h2 className="text-xl font-semibold">Check your email</h2>
                <p className="text-sm text-gray-600">
                  If an account exists for this email, we’ve sent a password reset link.
                  Please check your inbox and the Spam folder.
                </p>
                <Link href="/" className="text-blue-600 hover:text-blue-700 underline text-sm">
                  Back to Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}