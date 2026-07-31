import type { HTMLAttributes, Ref } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const cardVariants = cva('rounded-lg border border-border bg-surface text-foreground', {
  variants: {
    variant: {
      default: 'shadow-sm',
      elevated: 'shadow-2xl',
      subtle: 'bg-surface-alt',
      ghost: 'border-transparent bg-transparent shadow-none',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  ref?: Ref<HTMLDivElement>
}

export function Card({ className, variant, ref, ...props }: CardProps) {
  return <div ref={ref} className={cn(cardVariants({ variant, className }))} {...props} />
}

export interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>
}

export function CardHeader({ className, ref, ...props }: CardSectionProps) {
  return <div ref={ref} className={cn('flex flex-col gap-1.5 border-b border-border p-4', className)} {...props} />
}

export function CardTitle({ className, ref, ...props }: HTMLAttributes<HTMLHeadingElement> & { ref?: Ref<HTMLHeadingElement> }) {
  return <h3 ref={ref} className={cn('text-xl font-semibold tracking-tight text-foreground', className)} {...props} />
}

export function CardDescription({
  className,
  ref,
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { ref?: Ref<HTMLParagraphElement> }) {
  return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ref, ...props }: CardSectionProps) {
  return <div ref={ref} className={cn('p-4', className)} {...props} />
}

export function CardFooter({ className, ref, ...props }: CardSectionProps) {
  return <div ref={ref} className={cn('flex items-center gap-3 border-t border-border p-4', className)} {...props} />
}
