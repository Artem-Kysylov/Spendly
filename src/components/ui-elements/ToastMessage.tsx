// Import types
import { ToastMessageProps } from '../../types/types'

// Import components
import { CircleCheck, CircleX } from "lucide-react"

const ToastMessage = ({ text, type }: ToastMessageProps) => {
  const bgColor = type === 'success' ? 'bg-success' : 'bg-error';

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`${bgColor} text-white px-4 py-2 rounded-lg shadow-lg min-w-[200px] h-16 flex items-center`}>
        {type === 'success' ? (
          <CircleCheck className="mr-2" />    
      
        ) : (
          <CircleX className="mr-2" />  
        )}
        <span>{text}</span>
      </div>
    </div>
  )
}

export default ToastMessage