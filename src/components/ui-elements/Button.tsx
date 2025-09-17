// Import types
import { ButtonProps } from '../../types/types'
import { Button as UIButton } from "@/components/ui/button"
import type { ButtonVariant } from "@/components/ui/button"

const Button = ({ text, className = '', onClick, type = 'button', disabled, isLoading, icon, variant }: ButtonProps) => {
  // Normalize alias: primary → default (shadcn)
  const normalizedVariant = ((variant === 'primary' ? 'default' : (variant ?? 'default')) as ButtonVariant)

  return (
    <UIButton
      className={className}
      onClick={onClick}
      type={type}
      disabled={disabled}
      isLoading={isLoading}
      icon={icon}
      variant={normalizedVariant}
    >
      {text}
    </UIButton>
  )
}

export default Button