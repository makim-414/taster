import * as React from 'react'
import { cn } from './_cn'

// Skeleton loading placeholder. Neutral pulse, no dependency. The pulse stops under reduced motion.

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('motion-safe:animate-pulse rounded-md bg-bg-elev', className)} {...props} />
  ),
)
Skeleton.displayName = 'Skeleton'
