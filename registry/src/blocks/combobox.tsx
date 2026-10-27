import * as React from 'react'
import { Command } from 'cmdk'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from './_cn'

// Combobox. Searchable single select built on cmdk and a Radix popover (shadcn/ui pattern, MIT).

export interface ComboboxOption {
  value: string
  label: string
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4 10-10" />
    </svg>
  )
}
function ChevronIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-subtle" aria-hidden>
      <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
    </svg>
  )
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results',
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [internal, setInternal] = React.useState('')
  const current = value ?? internal
  const selected = options.find((o) => o.value === current)
  const choose = (v: string) => {
    const next = v === current ? '' : v
    onValueChange ? onValueChange(next) : setInternal(next)
    setOpen(false)
  }
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          className={cn(
            'flex h-11 desk:h-9 w-56 items-center justify-between gap-2 rounded-md border border-border bg-bg-elev px-3 text-sm outline-none transition-colors hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-ring',
            selected ? 'text-text' : 'text-text-subtle',
            className,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronIcon />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 w-56 overflow-hidden rounded-lg border border-border bg-bg-popover shadow-xl outline-none"
        >
          <Command className="w-full">
            <div className="border-b border-border-soft px-3">
              <Command.Input
                placeholder={searchPlaceholder}
                className="h-11 desk:h-9 w-full bg-transparent text-sm text-text outline-none placeholder:text-text-subtle"
              />
            </div>
            <Command.List className="max-h-60 overflow-auto p-1">
              <Command.Empty className="px-3 py-4 text-center text-caption text-text-subtle">{emptyText}</Command.Empty>
              {options.map((o) => (
                <Command.Item
                  key={o.value}
                  value={o.label}
                  onSelect={() => choose(o.value)}
                  className="flex cursor-default select-none items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-muted transition-colors aria-selected:bg-bg-elev aria-selected:text-text"
                >
                  <span className={cn('flex h-4 w-4 items-center justify-center', current === o.value ? 'opacity-100' : 'opacity-0')}>
                    <CheckIcon />
                  </span>
                  {o.label}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
