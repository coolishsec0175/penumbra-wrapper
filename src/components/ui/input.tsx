import type { InputHTMLAttributes, Ref } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const inputVariants = cva(
  'flex h-9 w-full rounded-md border border-border bg-surface-alt px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      invalid: {
        true: 'border-danger focus-visible:ring-danger',
        false: '',
      },
    },
    defaultVariants: {
      invalid: false,
    },
  }
)

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  ref?: Ref<HTMLInputElement>
  wrapperClassName?: string
}

export function Input({ className, error, ref, wrapperClassName, ...props }: InputProps) {
  const invalid = Boolean(error)

  return (
    <div className={cn('space-y-1.5', wrapperClassName)}>
      <input
        ref={ref}
        aria-invalid={invalid}
        className={cn(inputVariants({ invalid }), className)}
        {...props}
      />
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
