// Import types 
import { RadioButtonProps } from '../../types/types'

const RadioButton = ({ value, currentValue, variant, onChange, title, disabled = false, inactiveBgClassName }: RadioButtonProps) => {
  const getStyles = () => {
    const baseStyles = disabled ? 'cursor-not-allowed' : 'cursor-pointer'
    const opacityStyles = disabled ? 'opacity-50' : ''
    
    if (currentValue === value) {
      return variant === 'expense'
        ? `bg-error text-error-foreground border-error ${baseStyles} ${opacityStyles}`
        : `bg-success text-success-foreground border-success ${baseStyles} ${opacityStyles}`
    }
    return `${inactiveBgClassName ?? 'bg-background'} text-secondary-foreground border-border ${baseStyles} ${opacityStyles}`
  }

  return (
    <label className={`p-7 flex-1 rounded-lg border text-center font-medium transition-all ${getStyles()}`}>
      <input
        type="radio"
        name="type"
        value={value}
        className="hidden"
        checked={currentValue === value}
        onChange={onChange}
        disabled={disabled}
      />
      {title}
    </label>
  )
}

export default RadioButton