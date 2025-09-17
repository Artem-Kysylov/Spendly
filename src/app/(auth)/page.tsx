'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserAuth } from '@/context/AuthContext'
import Button from '@/components/ui-elements/Button'
import ToastMessage from '@/components/ui-elements/ToastMessage'

export default function AuthPage() {
    const { 
        session, 
        isReady, 
        signInWithGoogle, 
        signInWithPassword, 
        signUpWithPassword, 
        isSigningIn, 
        isSigningUp 
    } = UserAuth()
    const router = useRouter()

    // Перенаправление авторизованного пользователя
    useEffect(() => {
        if (isReady && session) {
            router.replace('/dashboard')
        }
    }, [isReady, session, router])

    const [tab, setTab] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null)

    const showError = (text: string) => {
        setToast({ text, type: 'error' })
        setTimeout(() => setToast(null), 3000)
    }

    // Валидация пароля (синхронно)
    const pwdCheck = useMemo(() => {
        const len = password.length >= 6
        const lower = /[a-z]/.test(password)
        const upper = /[A-Z]/.test(password)
        const digit = /\d/.test(password)
        const symbol = /[^A-Za-z0-9]/.test(password)
        return { len, lower, upper, digit, symbol, all: len && lower && upper && digit && symbol }
    }, [password])

    const onGoogle = async () => {
        const { error } = await signInWithGoogle()
        if (error) {
            showError(error.message || 'Google sign-in failed')
            return
        }
        router.replace('/dashboard')
    }

    const onEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        const { error } = await signInWithPassword(email, password)
        if (error) {
            showError(error.message || 'Invalid credentials')
            return
        }
        router.replace('/dashboard')
    }

    const onEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!pwdCheck.all) return
        const { error } = await signUpWithPassword(email, password)
        if (error) {
            showError(error.message || 'Sign up failed')
            return
        }
        router.replace('/dashboard')
    }

    if (!isReady) return null
    if (session) return null

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            {toast && <ToastMessage text={toast.text} type={toast.type} />}

            <div className="w-full max-w-md space-y-6">
                <h1 className="text-2xl font-semibold">Sign in to Spendly</h1>

                <Button
                    variant="primary"
                    className="w-full"
                    text="Sign in with Google"
                    onClick={onGoogle}
                />

                <div className="flex gap-2 mt-4">
                    <button
                        className={`px-3 py-1 rounded ${tab === 'signin' ? 'bg-primary text-white' : 'bg-gray-100'}`}
                        onClick={() => setTab('signin')}
                    >
                        Sign in
                    </button>
                    <button
                        className={`px-3 py-1 rounded ${tab === 'signup' ? 'bg-primary text-white' : 'bg-gray-100'}`}
                        onClick={() => setTab('signup')}
                    >
                        Sign up
                    </button>
                </div>

                {tab === 'signin' ? (
                    <form onSubmit={onEmailSignIn} className="space-y-3">
                        <input
                            type="email"
                            placeholder="Email"
                            className="input input-bordered w-full"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="input input-bordered w-full"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            text={isSigningIn ? 'Signing in...' : 'Sign in'}
                            disabled={isSigningIn}
                        />
                    </form>
                ) : (
                    <form onSubmit={onEmailSignUp} className="space-y-3">
                        <input
                            type="email"
                            placeholder="Email"
                            className="input input-bordered w-full"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="input input-bordered w-full"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        {/* Живой чеклист требований */}
                        <ul className="text-sm space-y-1">
                            <li className={pwdCheck.len ? 'text-green-600' : 'text-gray-500'}>• Minimum 6 characters</li>
                            <li className={pwdCheck.lower ? 'text-green-600' : 'text-gray-500'}>• At least one lowercase letter</li>
                            <li className={pwdCheck.upper ? 'text-green-600' : 'text-gray-500'}>• At least one uppercase letter</li>
                            <li className={pwdCheck.digit ? 'text-green-600' : 'text-gray-500'}>• At least one digit</li>
                            <li className={pwdCheck.symbol ? 'text-green-600' : 'text-gray-500'}>• At least one special symbol</li>
                        </ul>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            text={isSigningUp ? 'Creating account...' : 'Sign up'}
                            disabled={!pwdCheck.all || isSigningUp}
                        />
                    </form>
                )}
            </div>
        </div>
    )
}