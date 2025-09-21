'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import Button from '@/components/ui-elements/Button'
import { CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<'form' | 'success'>('form')
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Проверяем наличие токена в URL
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    
    if (accessToken && refreshToken) {
      // Устанавливаем сессию с токенами из URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
    }
  }, [searchParams])

  const validatePassword = (pwd: string) => {
    return {
      len: pwd.length >= 6,
      lower: /[a-z]/.test(pwd),
      upper: /[A-Z]/.test(pwd),
      digit: /\d/.test(pwd),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    }
  }

  const pwdCheck = validatePassword(password)
  const isPasswordValid = Object.values(pwdCheck).every(Boolean)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Валидация
    if (!isPasswordValid) {
      setError('Password does not meet requirements')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setIsSubmitting(true)
      
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        setError(error.message)
        return
      }

      setStage('success')
      
      // Перенаправляем на главную через 3 секунды
      setTimeout(() => {
        router.push('/')
      }, 3000)

    } catch (err: any) {
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
              Set your new password
            </h1>

            {stage === 'form' && (
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <p className="text-sm text-gray-600">
                  Enter your new password below. Make sure it meets all the requirements.
                </p>

                <div>
                  <label htmlFor="password" className="mb-1 block text-sm font-medium">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-900"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Требования к паролю */}
                <div className="text-xs space-y-1">
                  <div className={`flex items-center gap-2 ${pwdCheck.len ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{pwdCheck.len ? '✓' : '○'}</span>
                    <span>At least 6 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${pwdCheck.lower ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{pwdCheck.lower ? '✓' : '○'}</span>
                    <span>One lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${pwdCheck.upper ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{pwdCheck.upper ? '✓' : '○'}</span>
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${pwdCheck.digit ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{pwdCheck.digit ? '✓' : '○'}</span>
                    <span>One number</span>
                  </div>
                  <div className={`flex items-center gap-2 ${pwdCheck.symbol ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{pwdCheck.symbol ? '✓' : '○'}</span>
                    <span>One special character</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-900"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
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
                  text={isSubmitting ? 'Updating password...' : 'Update password'}
                  disabled={!isPasswordValid || password !== confirmPassword || isSubmitting}
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
                <h2 className="text-xl font-semibold">Password updated!</h2>
                <p className="text-sm text-gray-600">
                  Your password has been successfully updated. You will be redirected to the sign in page shortly.
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