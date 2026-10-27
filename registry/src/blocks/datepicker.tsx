import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Calendar } from './calendar'
import { cn } from './_cn'

// DatePicker. A trigger button that shows the chosen date, with a Calendar in a Radix popover (shadcn/ui pattern, MIT).

export interface DatePickerProps {
  value?: Date
  onValueChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-subtle" aria-hidden>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </svg>
  )
}

function fmt(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function DatePicker({ value, onValueChange, placeholder = 'Pick a date', className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [internal, setInternal] = React.useState<Date | undefined>(undefined)
  const current = value ?? internal
  const set = (d: Date | undefined) => {
    onValueChange ? onValueChange(d) : setInternal(d)
    if (d) setOpen(false)
  }
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          className={cn(
            'flex h-11 desk:h-9 w-56 items-center gap-2 rounded-md border border-border bg-bg-elev px-3 text-sm outline-none transition-colors hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-ring',
            current ? 'text-text' : 'text-text-subtle',
            className,
          )}
        >
          <CalendarIcon />
          <span className="truncate">{current ? fmt(current) : placeholder}</span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 rounded-lg border border-border bg-bg-popover p-3 shadow-xl outline-none"
        >
          <Calendar mode="single" selected={current} onSelect={set} />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
