// Компонент: TextInput
import React from 'react'
import { TextInputProps } from '../../types/types'
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { type, placeholder, value, onChange, onInput, disabled, min, step, className, inputMode, autoFocus, onBlur },
  ref
) {
  return (
    <Input
      ref={ref}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onInput={onInput}
      onBlur={onBlur}
      disabled={disabled}
      min={min}
      step={step}
      inputMode={inputMode}
      autoFocus={autoFocus}
      className={cn("h-[50px] px-[20px]", className)}
    />
  )
})

export default TextInput