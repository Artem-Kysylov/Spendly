'use client'

// Import components 
import Button from '../ui-elements/Button'

interface EmptyStateProps {
  title: string
  description: string
  buttonText: string
  onButtonClick: () => void
}

const EmptyState = ({ title, description, buttonText, onButtonClick }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-5 mt-[100px] mb-24 lg:mb-28">
      {/* картинка и тексты */}
      <img src="/illustration-no-transactions.svg" alt="empty-state" />
      <h1 className="text-[26px] sm:text-[32px] md:text-[35px] font-semibold text-secondary-black text-center">{title}</h1>
      <p className="font-semibold text-secondary-black text-center">{description}</p>
      <Button 
        variant="primary"
        text={buttonText}
        onClick={onButtonClick} 
      />
    </div>  
  )
}

export default EmptyState