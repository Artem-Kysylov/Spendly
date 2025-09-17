'use client'

// Imports 
import { useRouter } from 'next/navigation'

// Import components 
import Button from '../ui-elements/Button'

const EmptyState = () => {
  const router = useRouter()
  
  const handleClick = () => {
    router.push('/transactions')
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 mt-[100px]">
      <img src="/illustration-no-transactions.svg" alt="empty-state" />
        <h1 className="text-[35px] font-semibold text-secondary-black text-center">Don`t have any transactions yet?</h1>
        <p className="font-semibold text-secondary-black text-center">Create new by clicking this button</p>
        <Button 
          variant="primary"
          text="Add Transaction"
          onClick={handleClick} 
        />
    </div>  
  )
}

export default EmptyState