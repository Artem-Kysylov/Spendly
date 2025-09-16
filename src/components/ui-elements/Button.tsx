// Import types
import { ButtonProps } from '../../types/types'

const Button = ({ text, className, onClick, type = 'button', disabled, isLoading, icon }: ButtonProps) => {
  return (
    <button 
      className={`btn ${className} ${disabled ? 'opacity-50 cursor-not-allowed bg-[#3559E0] text-white' : ''}`} 
      onClick={onClick}
      type={type}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <span className="loading loading-spinner loading-xs mr-2"></span>
          {text}
        </>
      ) : (
        <>
          {icon && <span className="icon-class">{icon}</span>}
          {text}
        </>
      )}
    </button>
  )
}

export default Button