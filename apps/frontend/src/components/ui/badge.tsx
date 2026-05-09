import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground",
        outline:
          "border border-border text-foreground bg-transparent",
        // Category-specific soft tints
        security:
          "bg-red-50 text-red-700",
        database:
          "bg-blue-50 text-blue-700",
        backend:
          "bg-emerald-50 text-emerald-700",
        frontend:
          "bg-amber-50 text-amber-700",
        tests:
          "bg-purple-50 text-purple-700",
        docs:
          "bg-zinc-100 text-zinc-600",
        infra:
          "bg-cyan-50 text-cyan-700",
        perf:
          "bg-pink-50 text-pink-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
