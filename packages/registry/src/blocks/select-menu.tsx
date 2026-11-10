import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cn } from './_cn'

// Select menu: a styled list select for when the native Select is not enough, usually because each
// option carries a dim hint at the end (a code, a shortcut, a unit). The trigger shows the chosen
// label itself, so nothing renders while the list is closed. Built on @radix-ui/react-select.
// Source: React port of oyna-ui's OSelect (https://github.com/azabroflovski/oyna-ui, a Vue SFC on
// reka-ui), as published on 21st.dev.
// Changes: styled with the registry field chrome and popover tokens instead of the --o-* variables
// (no acid green accent, no frosted list), 44px trigger and options on touch (36px on desk),
// invalid uses --destructive, and the chevron is the registry icon stroke.
// Upstream license: MIT, Copyright (c) 2026 azabroflovski. Full text in THIRD_PARTY_NOTICES.md.
//
// Prefer the native Select from blocks/input for plain lists: it is lighter and phones show their
// own picker. Reach for this one when the hint column earns its place.

export interface SelectMenuItem<T extends string = string> {
  value: T
  label: string
  /** A dim note at the end of the option, such as a code or a shortcut. */
  hint?: string
  disabled?: boolean
}

export interface SelectMenuProps<T extends string = string>
  extends Omit<React.ComponentPropsWithoutRef<'button'>, 'value' | 'defaultValue' | 'onChange'> {
  items: readonly SelectMenuItem<T>[]
  placeholder?: string
  disabled?: boolean
  /** Danger ring and aria-invalid. */
  invalid?: boolean
  value?: T
  defaultValue?: T
  onValueChange?: (value: T) => void
}

export function SelectMenu<T extends string = string>({
  items,
  placeholder = 'Select',
  disabled,
  invalid,
  value,
  defaultValue,
  onValueChange,
  className,
  ...attrs
}: SelectMenuProps<T>) {
  const [internal, setInternal] = React.useState<T | undefined>(defaultValue)
  const selected = value ?? internal
  const current = items.find((item) => item.value === selected)

  return (
    <SelectPrimitive.Root
      value={selected}
      onValueChange={(next: string) => {
        setInternal(next as T)
        onValueChange?.(next as T)
      }}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-invalid={invalid || undefined}
        className={cn(
          'inline-flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border-input bg-transparent px-3 text-left text-sm text-text outline-none desk:h-9',
          'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          'aria-[invalid=true]:border-[var(--destructive)] data-[placeholder]:text-text-subtle',
          className,
        )}
        {...attrs}
      >
        <SelectPrimitive.Value placeholder={placeholder}>{current?.label}</SelectPrimitive.Value>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-4 w-4 flex-none text-text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="var(--icon-stroke, 2)"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-bg-popover p-1 shadow-xl"
        >
          <SelectPrimitive.Viewport>
            {items.map((item) => (
              <SelectPrimitive.Item
                key={item.value}
                value={item.value}
                disabled={item.disabled}
                className={cn(
                  'relative flex min-h-11 cursor-default select-none items-center justify-between gap-6 rounded-md px-2.5 text-sm text-text-muted outline-none desk:min-h-9',
                  'data-[highlighted]:bg-bg-elev data-[highlighted]:text-text data-[state=checked]:text-text',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                <SelectPrimitive.ItemText>{item.label}</SelectPrimitive.ItemText>
                {item.hint ? <span className="tabular-nums text-caption text-text-subtle">{item.hint}</span> : null}
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
