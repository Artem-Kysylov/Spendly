// Imports 
import React from 'react'

const NewBudget = ({ onClick }: { onClick: () => void }) => {
  return (
    <div onClick={onClick} className='flex flex-col items-center justify-center gap-[8px] border border-primary rounded-lg cursor-pointer w-[335px] min-w-[335px] h-[200px] transition-colors duration-300 hover:bg-primary group'>
        <span className='text-2xl text-primary transition-colors duration-300 group-hover:text-white'>+</span>
        <p className='font-semibold text-primary transition-colors duration-300 group-hover:text-white'>Create a New Budget</p>
    </div>
  )
}

export default NewBudget