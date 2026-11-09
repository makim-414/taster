'use client'

import * as React from 'react'
import { cn } from './_cn'

// CopyButton. Copies a value to the clipboard and says so: the label turns to "Copied" for two seconds and the
// result is announced politely. Falls back to a hidden text area where the Clipboard API is not available, and
// says "Copy failed" instead of pretending. The button keeps its width while the label changes.

export interface CopyButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children' | 'value'> {
  value: string
  label?: string
  copiedLabel?: string
  failedLabel?: string
  /** How long the confirmation stays, in ms. */
  timeout?: number
  onCopied?: (value: string) => void
  variant?: 'outline' | 'ghost'
}

async function writeText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the text area fallback
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

export const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    { value, label = 'Copy', copiedLabel = 'Copied', failedLabel = 'Copy failed', timeout = 2000, onCopied, variant = 'outline', className, ...props },
    ref,
  ) => {
    const [state, setState] = React.useState<'idle' | 'copied' | 'failed'>('idle')
    const timer = React.useRef<number>()
    React.useEffect(() => () => window.clearTimeout(timer.current), [])

    const text = state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : label
    return (
      <>
        <button
          ref={ref}
          type="button"
          onClick={async () => {
            const ok = await writeText(value)
            setState(ok ? 'copied' : 'failed')
            if (ok) onCopied?.(value)
            window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => setState('idle'), timeout)
          }}
          className={cn(
            'inline-grid h-11 items-center rounded-md px-3 text-sm font-medium text-text outline-none desk:h-9',
            'transition-[colors,transform] duration-press ease-out active:scale-press',
            'focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
            variant === 'outline' ? 'border border-border hover:border-text-subtle' : 'hover:bg-bg-elev',
            className,
          )}
          {...props}
        >
          {/* Every label is laid in the same grid cell, so the widest one sets the width. */}
          {[label, copiedLabel, failedLabel].map((l) => (
            <span
              key={l}
              aria-hidden={l !== text}
              className={cn('col-start-1 row-start-1 inline-flex items-center justify-center gap-1.5', l === text ? 'visible' : 'invisible')}
            >
              {l === copiedLabel && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 13l4 4 10-10" />
                </svg>
              )}
              {l}
            </span>
          ))}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {state === 'copied' ? copiedLabel : state === 'failed' ? failedLabel : ''}
        </span>
      </>
    )
  },
)
CopyButton.displayName = 'CopyButton'
