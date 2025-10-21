'use client'

// Imports 
import React from 'react'
import { useRouter } from 'next/navigation'
import { UserAuth } from '../context/AuthContext' 

export const useSignWithGoogle = () => {
    const { signInWithGoogle } = UserAuth()
    const router = useRouter()

    const handleGoogleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        const { error } = await signInWithGoogle()
        if (!error) {
            // Редирект выполнит эффект на auth-странице после возврата из OAuth
            return
        }        
    }
    return handleGoogleClick
}
