// imports 

import { useTranslations } from 'next-intl'
import ProLockLabel from '../free/ProLockLabel'

function AddNewBudget({ onClick, disabled }: { onClick: () => void, disabled?: boolean }) {
  const tBudgets = useTranslations('budgets')
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative flex flex-col items-center justify-center gap-[8px] border border-primary rounded-lg w-full h-[200px] bg-card transition-colors duration-300 group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-primary'}`}
    >
      <span className={`text-2xl transition-colors duration-300 ${disabled ? 'text-primary' : 'text-primary group-hover:text-primary-foreground'}`}>+</span>
      <p className={`font-semibold transition-colors duration-300 ${disabled ? 'text-primary' : 'text-primary group-hover:text-primary-foreground'}`}>
        {tBudgets('list.card.createNew')}
      </p>
      {disabled && (
        <ProLockLabel className="absolute top-2 right-2" />
      )}
    </div>
  )
}

export default AddNewBudget