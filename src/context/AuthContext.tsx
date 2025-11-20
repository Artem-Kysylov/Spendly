'use client';
// Imports 
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from "../lib/supabaseClient"
import { Session, Subscription } from '@supabase/supabase-js'

// Import types
import { AuthContextType } from '../types/types'

const AuthContext = createContext<AuthContextType | null>(null)

// Экспортируем контекст для прямого использования
export { AuthContext }

export const AuthContextProvider = ({ children }: {children:React.ReactNode}) => {
    const [session, setSession] = useState<Session | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [isSigningIn, setIsSigningIn] = useState(false)
    const [isSigningUp, setIsSigningUp] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let active = true
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!active) return
          setSession(session)
          setIsReady(true)

          // Apply theme from user metadata on initial session
          applyUserThemePreference(session)
        })
    
        const {
          data: { subscription },
        }: { data: { subscription: Subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          // Обновляем session только для значимых auth-событий
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            setSession(session)
          }

          // Применение темы при входе и обновлении токена (метаданные уже применяются локально)
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            applyUserThemePreference(session)
          }
        })
    
        return () => {
          active = false
          subscription.unsubscribe()
        }
    }, [])

    // Helper: read theme from user_metadata and apply
    type Theme = "light" | "dark" | "system"
    const applyUserThemePreference = (session: Session | null) => {
      try {
        const pref = session?.user?.user_metadata?.theme_preference as Theme | undefined
        if (!pref || !["light","dark","system"].includes(pref)) return
        // Persist and apply
        window.localStorage.setItem("app-theme", pref)
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        const resolved = pref === "system" ? (prefersDark ? "dark" : "light") : pref
        document.documentElement.classList.toggle("dark", resolved === "dark")
        // Notify ThemeProvider to sync its state
        window.dispatchEvent(new CustomEvent("theme-preference-updated"))
      } catch {}
    }

    // Public API: update user theme preference in user_metadata
    const setUserThemePreference = async (theme: Theme) => {
      if (!["light","dark","system"].includes(theme)) return { error: new Error("Invalid theme value") }
      const { error } = await supabase.auth.updateUser({ data: { theme_preference: theme } })
      if (!error) {
        // Optimistically apply locally
        window.localStorage.setItem("app-theme", theme)
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme
        document.documentElement.classList.toggle("dark", resolved === "dark")
        window.dispatchEvent(new CustomEvent("theme-preference-updated"))
      }
      return { error }
    }

    // Sign in with Google
    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}${window.location.pathname}`
            }
        })

        if(error) {
            console.log('Error signing in with Google', error)
        } else {
            console.log('Signed in with Google', data)
        }
        
        return { error }         
    }

    // Signout from account 
    const signOut = async () => {
        const { error } = await supabase.auth.signOut()

        if(error) {
            console.log('Error signing out with Google', error)
        } else {
            console.log('Signed out successfully')
        }
    }

    // Email/Password: Sign in
    const signInWithPassword = async (email: string, password: string) => {
        try {
            setIsSigningIn(true)
            setError(null)
            const { data, error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) {
                setError(error.message)
                return { error }
            }
            return { data }
        } finally {
            setIsSigningIn(false)
        }
    }

    // Email/Password: Sign up
    const signUpWithPassword = async (email: string, password: string) => {
        try {
            setIsSigningUp(true)
            setError(null)
            const { data, error } = await supabase.auth.signUp({ email, password })
            if (error) {
                setError(error.message)
                return { error }
            }
            return { data }
        } finally {
            setIsSigningUp(false)
        }
    }

    return (
        <AuthContext.Provider value={{
            session,
            signInWithGoogle,
            signOut,
            signInWithPassword,
            signUpWithPassword,
            isReady,
            isSigningIn,
            isSigningUp,
            error,
            // expose theme setter via auth context
            setUserThemePreference,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const UserAuth = (): AuthContextType => {
    const context = useContext(AuthContext)
    if(!context) {
        throw new Error('useAuth must be used within an AuthContextProvider')
    }
    return context
}

    