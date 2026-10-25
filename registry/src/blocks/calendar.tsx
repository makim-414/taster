import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { cn } from './_cn'

// Calendar. Wraps react-day-picker (shadcn/ui pattern, MIT).
// Colors come from the .rdp-* variables in src/base.css, which map to tokens.

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, ...props }: CalendarProps) {
  return <DayPicker className={cn('rdp-themed', className)} {...props} />
}
