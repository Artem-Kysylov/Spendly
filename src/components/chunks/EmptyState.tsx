// Imports 
import { useNavigate } from 'react-router-dom'

// Import components 
import Button from '../ui-elements/Button'

const EmptyState = () => {
  const navigate = useNavigate()
  
  const handleClick = () => {
    navigate('/transactions')
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 mt-[100px]">
      <img src="/illustration-no-transactions.svg" alt="empty-state" />
        <h1 className="text-[35px] font-semibold text-secondary-black text-center">Don`t have any transactions yet?</h1>
        <p className="font-semibold text-secondary-black text-center">Create new by clicking this button</p>
        <Button 
          className="btn-primary text-white"
          text="Add Transaction"
          onClick={handleClick} 
        />
    </div>  
  )
}

export default EmptyState