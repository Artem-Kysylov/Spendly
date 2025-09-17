'use client';
// Imports 
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from "../lib/supabaseClient"
import { Session, Subscription } from '@supabase/supabase-js'

// Import types
import { AuthContextType } from '../types/types'

const AuthContext = createContext<AuthContextType | null>(null)

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
        })
    
        const {
          data: { subscription },
        }: { data: { subscription: Subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
        })
    
        return () => {
          active = false
          subscription.unsubscribe()
        }
    }, [])


    // Sign in with Google
    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
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
            error
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