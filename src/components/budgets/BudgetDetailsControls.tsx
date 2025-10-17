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
    <div className="flex flex-col sm:flex-row w-full max-w-full items-start sm:items-center sm:justify-between gap-3 sm:gap-4">
        <Button
            text="Go to Budgets"
            className="p-0 text-primary"
            variant="ghost"
            onClick={() => router.push('/budgets')}
        />
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-4 sm:grid-cols-1">
            <Button
                icon={<Pencil size={16}/>}
                text="Edit budget"
                className="w-full justify-center p-0 text-primary"
                variant="ghost"
                onClick={onEditClick}
            />
            <Button
                icon={<Trash size={16}/>}
                text="Delete budget"
                className="w-full justify-center p-0 text-error"
                variant="ghost"
                onClick={onDeleteClick}
            />
        </div>
    </div>
  )
}

export default BudgetDetailsControls