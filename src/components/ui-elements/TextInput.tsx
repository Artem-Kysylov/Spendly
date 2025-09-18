// Imports 
import { TextInputProps } from '../../types/types'
import { Input } from "@/components/ui/input"

const TextInput = ({ type, placeholder, value, onChange, onInput, disabled, min, step }: TextInputProps) => {
  return (
    <Input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onInput={onInput}
      disabled={disabled}
      min={min}
      step={step}
      className="h-[50px] px-[20px]"
    />
  )
}

export default TextInput