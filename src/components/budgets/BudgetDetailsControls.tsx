// Imports 
import { useRouter } from '@/i18n/routing'
import { MoreVertical } from 'lucide-react'
// import components 
import Button from '../ui-elements/Button'
import { useTranslations } from 'next-intl'
import Dropdown from '../ui-elements/Dropdown'

// Import types
import { BudgetDetailsControlsProps } from '../../types/types'
const BudgetDetailsControls = ({ onDeleteClick, onEditClick }: BudgetDetailsControlsProps) => {
  const router = useRouter()
  const tBudgets = useTranslations('budgets')
  return (
    <div className="flex w-full items-center justify-between gap-3">
        <Button
            text={tBudgets('details.controls.goToBudgets')}
            className="p-0 text-primary"
            variant="ghost"
            onClick={() => router.push('/budgets')}
        />
        <div className="flex items-center">
          <Dropdown
            ariaLabel="More actions"
            buttonVariant="ghost"
            buttonSize="icon"
            icon={<MoreVertical className="h-4 w-4" />}
            items={[
              {
                label: tBudgets('details.controls.editBudget'),
                onClick: onEditClick,
              },
              {
                label: tBudgets('details.controls.deleteBudget'),
                onClick: onDeleteClick,
                destructive: true,
              },
            ]}
          />
        </div>
    </div>
  )
}

export default BudgetDetailsControls