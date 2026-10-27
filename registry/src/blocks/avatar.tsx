import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from './_cn'

// Avatar. Built on @radix-ui/react-avatar, styled in the shadcn/ui pattern (MIT).
// Falls back to initials on a neutral surface with a hairline border.
// Upstream license: MIT, Copyright (c) 2023 shadcn. Full text in THIRD_PARTY_NOTICES.md.

export type AvatarSize = 'sm' | 'md' | 'lg'

const SIZE: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-caption',
  md: 'h-10 w-10 text-label',
  lg: 'h-14 w-14 text-title',
}

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  size?: AvatarSize
}

export const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ size = 'md', className, ...props }, ref) => (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        'border border-border bg-bg-elev text-text-muted font-medium',
        SIZE[size],
        className,
      )}
      {...props}
    />
  ),
)
Avatar.displayName = 'Avatar'

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn('h-full w-full object-cover', className)} {...props} />
))
AvatarImage.displayName = 'AvatarImage'

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn('flex h-full w-full items-center justify-center tracking-[-0.01em]', className)}
    {...props}
  />
))
AvatarFallback.displayName = 'AvatarFallback'
