// Import types 
import { RadioButtonProps } from '../../types/types'

const RadioButton = ({ value, currentValue, variant, onChange, title }: RadioButtonProps) => {
  const getStyles = () => {
    if (currentValue === value) {
      return variant === 'expense'
        ? 'bg-error text-error-foreground border-error'
        : 'bg-success text-success-foreground border-success'
    }
    return 'text-secondary-foreground border-border'
  }

  return (
    <label className={`cursor-pointer p-7 flex-1 rounded-lg border text-center font-medium transition-all ${getStyles()}`}>
      <input
        type="radio"
        name="type"
        value={value}
        className="hidden"
        checked={currentValue === value}
        onChange={onChange}
      />
      {title}
    </label>
  )
}

export default RadioButton