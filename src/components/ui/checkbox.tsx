"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { TOUCH_TARGET } from "@/lib/constants/responsive"

/**
 * Props for Checkbox component
 */
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional label text */
  label?: string
}

/**
 * Touch-friendly checkbox with ≥44px touch target
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className={cn("flex items-center gap-2 cursor-pointer", TOUCH_TARGET.MIN_HEIGHT, className)}>
        <input
          type="checkbox"
          ref={ref}
          className="sr-only peer"
          {...props}
        />
        <div className="h-5 w-5 border-2 border-gray-300 rounded peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring transition-colors flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-white hidden peer-checked:block" />
        </div>
        {label && <span className="text-sm">{label}</span>}
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
