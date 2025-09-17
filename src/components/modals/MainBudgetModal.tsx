import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { UserAuth } from '../../context/AuthContext'

// Import components 
import Button from '../ui-elements/Button'
import TextInput from '../ui-elements/TextInput'

// Import types 
import { MainBudgetModalProps } from '../../types/types'

// Component: TotalBudgetModal
const TotalBudgetModal = ({ title, onClose, onSubmit }: MainBudgetModalProps) => {
    const { session } = UserAuth()
    const dialogRef = useRef<HTMLDialogElement>(null)

    // State 
    const [amount, setAmount] = useState<string>('')
    const [isLoading, setIsLoading] = useState<boolean>(false)
    
    useEffect(() => {
        if (dialogRef.current) {
            dialogRef.current.showModal()
        }

        // Fetch current budget when modal opens
        const fetchCurrentBudget = async () => {
            if (!session?.user?.id) return

            try {
                const { data, error } = await supabase
                    .from('main_budget')
                    .select('amount')
                    .eq('user_id', session.user.id)
                    .single()

                if (error) {
                    console.error('Error fetching budget:', error)
                    return
                }

                if (data) {
                    setAmount(data.amount.toString())
                }
            } catch (error) {
                console.error('Error fetching budget:', error)
            }
        }

        fetchCurrentBudget()

        return () => {
            if (dialogRef.current) {
                dialogRef.current.close()
            }
        }
    }, [session?.user?.id])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!session?.user) return onSubmit('Please login to update budget', 'error')    
    
        try {
            setIsLoading(true)
            const { data, error } = await supabase
                .from('main_budget')
                .update({ amount: Number(amount) })
                .eq('user_id', session.user.id)
                .select()
    
            if (error) {
                console.error('Error updating budget:', error)
                onSubmit('Failed to update budget. Please try again.', 'error')
            } else {
                console.log('Budget updated successfully:', data)
                onClose()
                onSubmit('Budget updated successfully!', 'success')
            }
        } catch (error) {
            console.error('Error:', error)
            onSubmit('An unexpected error occurred. Please try again.', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <dialog ref={dialogRef} className="modal">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4 text-center">{title}</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <TextInput
                        type="number"
                        placeholder="Amount(USD)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    <div className="modal-action justify-center gap-4">
                        <Button
                            text="Cancel"
                            variant="ghost"
                            className="text-primary w-[218px]"
                            onClick={onClose}
                        />
                        <Button
                            type="submit"
                            text="Save"
                            variant="default"
                            className="w-[218px]"
                            disabled={isLoading}
                            isLoading={isLoading}
                        />
                    </div>
                </form>
            </div>
        </dialog>
    )
}

export default TotalBudgetModal