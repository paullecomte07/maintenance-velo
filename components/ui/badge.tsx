import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Familles de sens : fond teinté, encre foncée, bordure assortie.
        // Toujours accompagnées de leur libellé — la couleur ne fait
        // qu'accélérer la lecture, elle ne la remplace pas.
        ok: "border-ok-foreground/20 bg-ok text-ok-foreground",
        warn: "border-warn-foreground/20 bg-warn text-warn-foreground",
        info: "border-info-foreground/20 bg-info text-info-foreground",
        alert: "border-alert-foreground/25 bg-alert text-alert-foreground",
        /** Donnée absente, jamais inventée : pointillés et encre discrète. */
        absent: "border-dashed border-input font-normal text-muted-foreground",
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
