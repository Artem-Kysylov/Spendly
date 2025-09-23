// Import types 
import { BudgetDetailsProps } from '../../types/types' 

const BudgetDetailsInfo = ({ emoji, name, amount }: BudgetDetailsProps) => {
  return (
    <div className='flex flex-col items-center justify-center gap-[8px] border border-light-grey rounded-lg h-full'>
      <span className='text-[25px]'>{emoji}</span>
      <h1 className='text-secondary-black text-[25px] font-semibold'>{name}</h1>
      <p className='text-secondary-black text-[25px] font-semibold'>${amount}</p>
    </div>
  )
}

export default BudgetDetailsInfo