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

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session)
        })
    
        const {
          data: { subscription },
        }: { data: { subscription: Subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setSession(session);
        })
    
        return () => subscription.unsubscribe()
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

    return (
        <AuthContext.Provider value={{session, signInWithGoogle, signOut }}>
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