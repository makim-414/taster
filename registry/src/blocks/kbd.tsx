'use client'

import * as React from 'react'
import { cn } from './_cn'

// Kbd, KbdCombo and ShortcutHint. Keyboard key labels for menus, tooltips, empty search fields and help sheets.
// Keys are set in the interface face, sentence case, on a hairline key cap. Browsers (and Tailwind's preflight) give
// <kbd> a monospace face; `font-[family-name:inherit]` hands it back the surrounding interface face instead of choosing one.
// `useModKey` returns Cmd on Apple platforms and Ctrl elsewhere, so a hint matches the keyboard in front of the reader.

export type KbdProps = React.HTMLAttributes<HTMLElement>

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(({ className, ...props }, ref) => (
  <kbd
    ref={ref}
    className={cn(
      'inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border bg-bg-elev px-1',
      'font-[family-name:inherit] text-micro font-medium not-italic text-text-muted',
      className,
    )}
    {...props}
  />
))
Kbd.displayName = 'Kbd'

/** "Cmd" on Apple platforms, "Ctrl" elsewhere. Starts as "Ctrl" so server and first client render agree. */
export function useModKey(): 'Cmd' | 'Ctrl' {
  const [mod, setMod] = React.useState<'Cmd' | 'Ctrl'>('Ctrl')
  React.useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } }
    const platform = nav.userAgentData?.platform || nav.platform || ''
    if (/mac|iphone|ipad|ipod/i.test(platform)) setMod('Cmd')
  }, [])
  return mod
}

export interface KbdComboProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Keys in press order. Use "mod" for Cmd or Ctrl, resolved for the current platform. */
  keys: string[]
}

/** A chord such as mod + K. Screen readers hear one phrase ("Ctrl K"), not a list of separate keys. */
export function KbdCombo({ keys, className, ...props }: KbdComboProps) {
  const mod = useModKey()
  const resolved = keys.map((k) => (k.toLowerCase() === 'mod' ? mod : k))
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-label={resolved.join(' ')} role="img" {...props}>
      {resolved.map((k, i) => (
        <Kbd key={i} aria-hidden="true">
          {k}
        </Kbd>
      ))}
    </span>
  )
}

export interface ShortcutHintProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  keys: string[]
}

/** One row of a shortcut list or a menu: what it does on the left, the keys on the right. */
export function ShortcutHint({ label, keys, className, ...props }: ShortcutHintProps) {
  return (
    <div className={cn('flex min-h-8 items-center justify-between gap-4 text-sm', className)} {...props}>
      <span className="text-text-muted">{label}</span>
      <KbdCombo keys={keys} />
    </div>
  )
}
