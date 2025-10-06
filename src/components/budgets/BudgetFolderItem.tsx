import React from 'react'

// Import types 
import type { BudgetFolderItemProps } from '../../types/types'

const BudgetFolderItem = ({ emoji, name, amount }: BudgetFolderItemProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-[8px] border border-border rounded-lg w-[335px] min-w-[335px] h-[200px] bg-card transition-opacity duration-300 hover:opacity-50">
      <span className="text-[28px]">{emoji}</span>
      <h3 className="text-foreground text-[16px] font-semibold">{name}</h3>
      <p className="text-foreground text-[25px] font-semibold">${amount}</p>
    </div>
  )
}

export default BudgetFolderItem