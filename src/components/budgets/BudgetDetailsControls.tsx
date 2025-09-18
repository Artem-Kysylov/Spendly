// Imports 
import { useRouter } from 'next/navigation'
import { Pencil, Trash } from 'lucide-react'

// import components 
import Button from '../ui-elements/Button'

// Import types
import { BudgetDetailsControlsProps } from '../../types/types'
const BudgetDetailsControls = ({ onDeleteClick, onEditClick }: BudgetDetailsControlsProps) => {
  const router = useRouter()

  return (
    <div className='flex items-center justify-between'>
        <Button
            text="Go to Budgets"
            className="p-0 text-primary"
            variant="ghost"
            onClick={() => router.push('/budgets')}
        />
        <div className='flex items-center gap-8'>
            <Button
                icon={<Pencil size={16}/>}
                text="Edit budget"
                className="p-0 text-primary"
                variant="ghost"
                onClick={onEditClick}
            />
            <Button
                icon={<Trash size={16}/>}
                text="Delete"
                className="p-0 text-error"
                variant="ghost"
                onClick={onDeleteClick}
            />
        </div>
    </div>
  )
}

export default BudgetDetailsControls