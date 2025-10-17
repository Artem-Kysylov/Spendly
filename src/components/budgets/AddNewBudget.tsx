// Imports 
import React from 'react'

function AddNewBudget({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-[8px] border border-primary rounded-lg cursor-pointer w-full sm:w-[335px] h-[200px] bg-card transition-colors duration-300 hover:bg-primary group"
    >
      <span className="text-2xl text-primary transition-colors duration-300 group-hover:text-primary-foreground">+</span>
      <p className="font-semibold text-primary transition-colors duration-300 group-hover:text-primary-foreground">Create a New Budget</p>
    </div>
  )
}

export default AddNewBudget