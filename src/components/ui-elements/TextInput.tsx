// Imports 
import { TextInputProps } from '../../types/types'

const TextInput = ({ type, placeholder, value, onChange, onInput, disabled }: TextInputProps) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onInput={onInput}
      disabled={disabled}
      className='w-full h-[50px] rounded-lg border light-grey px-[20px] outline-none focus:border-primary transition-colors duration-300'
    />
  )
}

export default TextInput