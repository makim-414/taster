import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from './_cn'

// Popover. Built on @radix-ui/react-popover, styled in the shadcn/ui pattern (MIT).
// Upstream license: MIT, Copyright (c) 2023 shadcn. Full text in THIRD_PARTY_NOTICES.md.

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor
export const PopoverClose = PopoverPrimitive.Close

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-lg border border-border bg-bg-popover p-4 shadow-xl outline-none',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = 'PopoverContent'
