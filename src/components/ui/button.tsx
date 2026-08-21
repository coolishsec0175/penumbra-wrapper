import type { ButtonHTMLAttributes, Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-mono text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_12px_-2px_var(--accent-soft)]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        ghost: 'bg-transparent text-foreground hover:bg-surface-hover',
        outline: 'border border-border bg-surface/60 text-foreground hover:bg-surface-hover hover:border-accent/50 backdrop-blur-sm',
        destructive: 'bg-danger text-danger-foreground hover:bg-danger-hover',
        success: 'bg-success text-success-foreground hover:bg-success-hover',
        warning: 'bg-warning text-warning-foreground hover:bg-warning-hover',
      },
      size: {
        default: 'h-9 px-3.5 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-5',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  className,
  variant,
  size,
  ref,
  ...props
}: ButtonProps) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
}