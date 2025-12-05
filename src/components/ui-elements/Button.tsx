// Imports
import React from "react";

// Import types
import { ButtonProps } from "../../types/types";
import type { VariantProps } from "class-variance-authority";

// Import components
import { Button as UIButton, buttonVariants } from "@/components/ui/button";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      text,
      className = "",
      onClick,
      type = "button",
      disabled,
      isLoading,
      icon,
      variant,
    },
    ref,
  ) => {
    // Normalize alias: primary → default (shadcn)
    const normalizedVariant = (
      variant === "primary" ? "default" : (variant ?? "default")
    ) as ButtonVariant;

    return (
      <UIButton
        ref={ref}
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
    );
  },
);
Button.displayName = "Button";

export default Button;
