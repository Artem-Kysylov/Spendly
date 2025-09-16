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
            className="btn-ghost text-primary p-0"
            onClick={() => router.push('/budgets')}
        />
        <div className='flex items-center gap-2'>
            <Button
                icon={<Pencil />}
                text="Edit budget"
                className="btn-ghost text-primary p-0"
                onClick={onEditClick}
            />
            <Button
                icon={<Trash />}
                text="Delete"
                className="btn-ghost text-error p-0"
                onClick={onDeleteClick}
            />
        </div>
    </div>
  )
}

export default BudgetDetailsControls