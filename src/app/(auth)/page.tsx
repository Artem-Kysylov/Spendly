'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserAuth } from '@/context/AuthContext'
import Button from '@/components/ui-elements/Button'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, EyeOff } from 'lucide-react'
import Image from 'next/image'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Link from 'next/link'

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

    useEffect(() => {
        if (isReady && session) {
            router.replace('/dashboard')
        }
    }, [isReady, session, router])

    const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' } | null>(null)
    const [rememberMe, setRememberMe] = useState(false)
    const [showPwd, setShowPwd] = useState(false)

    const showError = (text: string) => {
        setToast({ text, type: 'error' })
        setTimeout(() => setToast(null), 3000)
    }

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
        // Remember me — remember email
        if (rememberMe) {
            localStorage.setItem('auth:rememberMe', '1')
            localStorage.setItem('auth:rememberedEmail', email)
        } else {
            localStorage.removeItem('auth:rememberMe')
            localStorage.removeItem('auth:rememberedEmail')
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
        if (rememberMe) {
            localStorage.setItem('auth:rememberMe', '1')
            localStorage.setItem('auth:rememberedEmail', email)
        }
        router.replace('/dashboard')
    }

    useEffect(() => {
        document.documentElement.classList.remove('dark')

        const remembered = localStorage.getItem('auth:rememberMe') === '1'
        const savedEmail = localStorage.getItem('auth:rememberedEmail') || ''
        if (remembered && savedEmail) {
            setEmail(savedEmail)
            setRememberMe(true)
        }
    }, [])

    if (!isReady) return null
    if (session) return null

    return (
        <div
            className="min-h-screen bg-cover bg-center"
            style={{ backgroundImage: "url('/Sign up screen-bg.png')" }}
        >
            <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md rounded-[10px] border border-gray-200 bg-white text-gray-900 shadow-sm dark:bg-white dark:text-gray-900">
                    <div className="p-6 sm:p-8">
                        <div className="flex justify-center">
                            <Image src="/Spendly-logo.svg" alt="Spendly" width={120} height={32} />
                        </div>

                        <h1 className="mt-6 mb-4 text-2xl font-semibold text-center">
                            {activeTab === 'signin' ? 'Sign in' : 'Sign up'}
                        </h1>

                        <div className="w-full max-w-md space-y-6">
                            {/* Кнопка Google */}
                            <Button
                                variant="outline"
                                className="w-full bg-white text-black border border-gray-300 hover:bg-gray-50"
                                text="Sign in with Google"
                                icon={<Image src="/google.svg" alt="Google" width={20} height={20} />}
                                onClick={onGoogle}
                            />

                            <div className="flex items-center gap-3">
                              <div className="h-px flex-1 bg-gray-300" />
                              <span className="text-xs text-gray-500 uppercase tracking-wide">or</span>
                              <div className="h-px flex-1 bg-gray-300" />
                            </div>

                            <Tabs
                              value={activeTab}
                              onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')}
                              className="mt-6"
                            >
                              {/* TabsList / TabsTrigger / TabsContent — без изменений */}
                              <div className="flex justify-center">
                                <TabsList>
                                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                                </TabsList>
                              </div>

                              <TabsContent value="signin">
                                <form onSubmit={onEmailSignIn} className="space-y-3">
                                    <Input
                                        type="email"
                                        placeholder="Email"
                                        className="h-[50px] px-[20px]"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <div className="relative">
                                        <Input
                                            type={showPwd ? 'text' : 'password'}
                                            placeholder="Password"
                                            className="h-[50px] px-[20px] pr-10"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPwd((v) => !v)}
                                            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-900"
                                            aria-label={showPwd ? 'Hide password' : 'Show password'}
                                        >
                                            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="inline-flex items-center gap-2">
                                            <Checkbox
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            <span className="text-sm text-secondary-black">Remember me</span>
                                        </label>

                                        <Link
                                            href="/forgot-password"
                                            className="text-blue-600 hover:text-blue-700 underline text-sm"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="w-full"
                                        text={isSigningIn ? 'Signing in...' : 'Sign in'}
                                        disabled={isSigningIn}
                                    />
                                </form>
                              </TabsContent>

                              <TabsContent value="signup">
                                <form onSubmit={onEmailSignUp} className="space-y-3">
                                    <Input
                                        type="email"
                                        placeholder="Email"
                                        className="h-[50px] px-[20px]"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <div className="relative">
                                        <Input
                                            type={showPwd ? 'text' : 'password'}
                                            placeholder="Password"
                                            className="h-[50px] px-[20px] pr-10"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPwd((v) => !v)}
                                            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-900"
                                            aria-label={showPwd ? 'Hide password' : 'Show password'}
                                        >
                                            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>

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

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        className="w-full"
                                        text={isSigningUp ? 'Creating account...' : 'Sign up'}
                                        disabled={!pwdCheck.all || isSigningUp}
                                    />
                                </form>
                              </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}