import React from 'react'
import { useNavigate } from 'react-router-dom'
import { UserAuth } from '../context/AuthContext' 

export const useSignWithGoogle = () => {
    const { signInWithGoogle } = UserAuth()
        const navigate = useNavigate()

        const handleGoogleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.preventDefault()
            const { error } = await signInWithGoogle()
            if(!error) {
                navigate('/dashboard')
            }        
        }
  return handleGoogleClick
}
