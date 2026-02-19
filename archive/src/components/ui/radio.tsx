"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { TOUCH_TARGET } from "@/lib/constants/responsive"

/**
 * Props for Radio component
 */
interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional label text */
  label?: string
}

/**
 * Touch-friendly radio button with ≥44px touch target
 */
const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className={cn("flex items-center gap-2 cursor-pointer", TOUCH_TARGET.MIN_HEIGHT, className)}>
        <input
          type="radio"
          ref={ref}
          className="sr-only peer"
          {...props}
        />
        <div className="h-5 w-5 border-2 border-gray-300 rounded-full peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring transition-colors flex items-center justify-center">
          <div className="h-2.5 w-2.5 bg-white rounded-full hidden peer-checked:block" />
        </div>
        {label && <span className="text-sm">{label}</span>}
      </label>
    )
  }
)
Radio.displayName = "Radio"

export { Radio }
