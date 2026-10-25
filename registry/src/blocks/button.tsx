import * as React from 'react'
import { cn } from './_cn'

// Button with solid, secondary, outline, ghost and destructive variants.
// API follows the shadcn/ui button (MIT). The solid variant uses the accent token so a theme can recolor it.

export type ButtonVariant = 'solid' | 'secondary' | 'outline' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const VARIANT: Record<ButtonVariant, string> = {
  solid: 'bg-accent text-accent-fg border border-transparent hover:opacity-90',
  secondary: 'bg-bg-elev text-text border border-border hover:border-text-subtle',
  outline: 'bg-transparent text-text border border-border hover:border-text-subtle',
  ghost: 'bg-transparent text-text-muted border border-transparent hover:text-text hover:bg-bg-elev',
  destructive: 'bg-transparent text-danger border border-border hover:border-danger',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-md',
  md: 'h-9 px-4 text-sm rounded-md',
  lg: 'h-11 px-6 text-title rounded-md',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'solid', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] outline-none',
        'transition-[colors,transform] duration-press ease-out active:scale-press',
        'focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
