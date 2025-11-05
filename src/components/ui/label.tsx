import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
// class-variance-authority is no longer strictly needed for basic labels
// import { cva, type VariantProps } from "class-variance-authority"

import styles from "./label.module.css" // Import CSS Module

// Removed VariantProps as cva is removed
// const labelVariants = cva(
//   "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
// )

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
  // & VariantProps<typeof labelVariants> // Removed
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    // className={cn(labelVariants(), className)} // Modified
    className={`${styles.label} ${className}`}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
