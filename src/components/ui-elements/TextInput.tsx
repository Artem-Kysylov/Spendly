// Imports 
import { TextInputProps } from '../../types/types'
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const TextInput = ({ type, placeholder, value, onChange, onInput, disabled, min, step, className }: TextInputProps) => {
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
      className={cn("h-[50px] px-[20px]", className)}
    />
  )
}

export default TextInput