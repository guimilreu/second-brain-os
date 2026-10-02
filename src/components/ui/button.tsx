import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
	"group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full border border-transparent text-sm font-semibold whitespace-nowrap outline-none select-none transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-200 focus-visible:ring-3 focus-visible:ring-ring/35 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_40%,transparent),0_8px_24px_-8px_color-mix(in_oklch,var(--primary)_60%,transparent)] hover:brightness-110 hover:shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_60%,transparent),0_10px_32px_-6px_color-mix(in_oklch,var(--primary)_75%,transparent)]",
				outline:
					"border-border bg-foreground/[0.03] text-foreground hover:bg-foreground/[0.07] aria-expanded:bg-foreground/[0.07]",
				secondary:
					"bg-foreground/[0.07] text-foreground hover:bg-foreground/[0.11] aria-expanded:bg-foreground/[0.11]",
				ghost:
					"text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground aria-expanded:bg-foreground/[0.06] aria-expanded:text-foreground",
				destructive:
					"bg-negative/12 text-negative hover:bg-negative/20 focus-visible:ring-negative/25",
				link: "h-auto px-0 text-primary-ink underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 gap-2 px-4",
				xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1.5 px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-12 gap-2 px-5 text-[0.9375rem]",
				icon: "size-10",
				"icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-12",
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
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }
