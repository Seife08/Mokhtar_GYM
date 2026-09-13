import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * MOKHTAR button system — forged-metal look instead of flat template fills.
 * Layered design: gradient body + inset bevel (light top edge / dark bottom
 * edge) + ambient gold glow. Press sinks the plate into the surface.
 */
const buttonVariants = cva(
  "relative isolate inline-flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden rounded-lg text-sm font-bold tracking-wide transition-[transform,box-shadow,filter,border-color,background-color,color] duration-150 ease-out select-none disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none active:duration-75 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        /** signature gold plate */
        default:
          "text-[#3A2D00] shadow-[inset_0_1px_0_rgba(255,255,255,.42),inset_0_-2px_0_rgba(138,101,0,.5),0_2px_4px_rgba(0,0,0,.45),0_0_14px_rgba(245,196,0,.16)] bg-[linear-gradient(180deg,#FFE066_0%,#F5C400_48%,#DBA900_100%)] hover:brightness-[1.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.5),inset_0_-2px_0_rgba(138,101,0,.5),0_3px_8px_rgba(0,0,0,.5),0_0_20px_rgba(245,196,0,.28)] hover:-translate-y-[1px] active:translate-y-[1px] active:brightness-95 active:shadow-[inset_0_2px_5px_rgba(0,0,0,.35)]",
        /** brushed dark steel */
        secondary:
          "text-neutral-100 bg-[linear-gradient(180deg,#262626_0%,#1A1A1A_55%,#141414_100%)] border border-[#2E2A1A] shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_2px_4px_rgba(0,0,0,.35)] hover:border-primary/45 hover:text-primary hover:shadow-[inset_0_1px_0_rgba(255,255,255,.09),0_0_12px_rgba(245,196,0,.12)] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[inset_0_2px_5px_rgba(0,0,0,.45)]",
        /** hairline outline */
        outline:
          "border border-[#3A3625] bg-transparent text-neutral-300 hover:border-primary/50 hover:bg-primary/[.06] hover:text-primary hover:shadow-[0_0_10px_rgba(245,196,0,.08)] active:translate-y-px",
        ghost:
          "text-neutral-300 hover:bg-primary/[.08] hover:text-primary active:translate-y-px",
        destructive:
          "text-[#FFE8E8] bg-[linear-gradient(180deg,#E5484D_0%,#C93A3F_55%,#A62C31_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.25),inset_0_-2px_0_rgba(90,16,18,.55),0_2px_4px_rgba(0,0,0,.4)] hover:brightness-105 hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[inset_0_2px_5px_rgba(0,0,0,.35)]",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3.5",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4 text-[15px]",
        icon: "size-9",
        block: "h-11 w-full px-5 text-[15px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
