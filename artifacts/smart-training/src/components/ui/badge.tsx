import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // @replit
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate ",
  {
    variants: {
      variant: {
        default:
          // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary:
          // @replit no hover because we use hover-elevate
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
          // @replit shadow-xs" - use badge outline variable
        outline: "text-foreground border [border-color:var(--badge-outline)]",
        // Soft pastel/pale colors with dark text
        success: "border-transparent bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/80 transition-all",
        info: "border-transparent bg-sky-50 text-sky-700 border border-sky-100 hover:bg-sky-100/80 transition-all",
        warning: "border-transparent bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100/80 transition-all",
        error: "border-transparent bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100/80 transition-all",
        purple: "border-transparent bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100/80 transition-all",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
