import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
// import { cva, type VariantProps } from "class-variance-authority" // Removed

import styles from "./button.module.css" // Import CSS Module

// Removed buttonVariants cva definition

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Removed VariantProps
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    // Manually map variant and size to CSS Module classes
    const variantClass = styles[variant];
    const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`]; // e.g., sizeDefault, sizeSm

    return (
      <Comp
        className={`${styles.button} ${variantClass} ${sizeClass} ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button } // Removed buttonVariants export