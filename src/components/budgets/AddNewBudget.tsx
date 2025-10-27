import React from 'react'
import { useTranslations } from 'next-intl'

function AddNewBudget({ onClick }: { onClick: () => void }) {
  const tBudgets = useTranslations('budgets')

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-[8px] border border-primary rounded-lg cursor-pointer w-full sm:w-[335px] h-[200px] bg-card transition-colors duration-300 hover:bg-primary group"
    >
      <span className="text-2xl text-primary transition-colors duration-300 group-hover:text-primary-foreground">+</span>
      <p className="font-semibold text-primary transition-colors duration-300 group-hover:text-primary-foreground">
        {tBudgets('list.card.createNew')}
      </p>
    </div>
  )
}

export default AddNewBudget