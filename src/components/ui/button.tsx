import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import styles from "./button.module.css"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Manually map variant and size to CSS Module classes
    const variantClass = styles[variant] || styles.default;
    const sizeKey = `size${size.charAt(0).toUpperCase() + size.slice(1)}`;
    const sizeClass = styles[sizeKey] || styles.sizeDefault;

    const combinedClassName = [
      styles.button,
      variantClass,
      sizeClass,
      className
    ].filter(Boolean).join(' ');

    return (
      <Comp
        className={combinedClassName}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
