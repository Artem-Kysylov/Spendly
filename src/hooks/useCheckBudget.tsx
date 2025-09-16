// Хук: useCheckBudget
'use client';
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

const useCheckBudget = (userId: string | undefined) => {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const checkBudget = async () => {
            if (!userId) {
                setIsLoading(false)
                return
            }

            try {
                console.log('Checking budget for user:', userId)
                
                const { data, error } = await supabase
                    .from('Budgets')
                    .select('id')
                    .eq('user_id', userId)

                console.log('Response:', { data, error })

                if (error) {
                    console.error('Error checking budget:', error)
                    return
                }

                if (!data || data.length === 0) {
                    router.push('/add-new-budget')
                }
            } catch (error) {
                console.error('Error checking budget:', error)
            } finally {
                setIsLoading(false)
            }
        }

        checkBudget()
    }, [userId, router])

    return { isLoading }
}

export default useCheckBudget