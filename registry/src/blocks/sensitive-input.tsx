import * as React from 'react'
import { cn } from './_cn'
import { Icon } from '../icons'

// Sensitive input: a field for an API key or token that stays masked until asked, with a reveal
// button and an optional copy button. Compound parts (container, field, reveal, copy) share one
// revealed state, so a custom layout keeps the same behavior.
// Written for this registry after a 21st.dev sensitive input the owner picked (cfui class names,
// shipped without its CSS and clipboard helper); its source and license could not be confirmed,
// so the parts were written new. One behavior was changed on purpose: the original took the reveal
// and copy buttons out of the tab order (tabIndex -1). Here they are reachable by keyboard.

interface Ctx {
  revealed: boolean
  toggle: () => void
  disabled?: boolean
  value?: string
}
const SensitiveContext = React.createContext<Ctx | null>(null)
const useSensitive = () => {
  const ctx = React.useContext(SensitiveContext)
  if (!ctx) throw new Error('SensitiveInput parts must sit inside SensitiveInputContainer')
  return ctx
}

export interface SensitiveInputContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  revealed?: boolean
  defaultRevealed?: boolean
  onRevealedChange?: (revealed: boolean) => void
  disabled?: boolean
  /** The value the copy button copies. */
  value?: string
}

export const SensitiveInputContainer = React.forwardRef<HTMLDivElement, SensitiveInputContainerProps>(
  ({ revealed, defaultRevealed = false, onRevealedChange, disabled, value, className, children, ...props }, ref) => {
    const [inner, setInner] = React.useState(defaultRevealed)
    const isRevealed = revealed ?? inner
    const toggle = React.useCallback(() => {
      if (revealed === undefined) setInner(!isRevealed)
      onRevealedChange?.(!isRevealed)
    }, [revealed, isRevealed, onRevealedChange])
    return (
      <SensitiveContext.Provider value={{ revealed: isRevealed, toggle, disabled, value }}>
        <div
          ref={ref}
          className={cn(
            'flex w-full items-center rounded-md border border-border-input pl-3',
            'focus-within:ring-2 focus-within:ring-ring',
            disabled && 'pointer-events-none opacity-50',
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </SensitiveContext.Provider>
    )
  },
)
SensitiveInputContainer.displayName = 'SensitiveInputContainer'

export const SensitiveInputField = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const ctx = React.useContext(SensitiveContext)
    const shown = ctx?.revealed ?? false
    return (
      <input
        ref={ref}
        type={shown ? 'text' : 'password'}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={cn(
          'h-11 min-w-0 flex-1 bg-transparent text-sm text-text tabular-nums outline-none placeholder:text-text-subtle desk:h-9',
          className,
        )}
        {...props}
      />
    )
  },
)
SensitiveInputField.displayName = 'SensitiveInputField'

const ICON_BUTTON =
  'grid h-11 w-11 flex-none place-items-center rounded-sm text-text-muted outline-none transition-colors hover:bg-bg-elev hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:h-9 desk:w-9'

export const SensitiveInputReveal = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, onClick, children, ...props }, ref) => {
    const { revealed, toggle, disabled } = useSensitive()
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={revealed ? 'Hide value' : 'Show value'}
        aria-pressed={revealed}
        onClick={(e) => {
          onClick?.(e)
          if (!e.defaultPrevented) toggle()
        }}
        className={cn(ICON_BUTTON, className)}
        {...props}
      >
        {children ?? <Icon name={revealed ? 'eye-off' : 'eye'} size="sm" />}
      </button>
    )
  },
)
SensitiveInputReveal.displayName = 'SensitiveInputReveal'

export interface SensitiveInputCopyProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  textToCopy?: string
  /** How long the "copied" state shows, in ms. Default 2000. */
  copyTimeout?: number
}

export const SensitiveInputCopy = React.forwardRef<HTMLButtonElement, SensitiveInputCopyProps>(
  ({ className, textToCopy, copyTimeout = 2000, onClick, children, ...props }, ref) => {
    const { value, disabled } = useSensitive()
    const [copied, setCopied] = React.useState(false)
    React.useEffect(() => {
      if (!copied) return
      const t = window.setTimeout(() => setCopied(false), copyTimeout)
      return () => window.clearTimeout(t)
    }, [copied, copyTimeout])
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        aria-label={copied ? 'Copied' : 'Copy value'}
        onClick={async (e) => {
          onClick?.(e)
          const text = textToCopy ?? value ?? ''
          if (e.defaultPrevented || !text) return
          try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
          } catch {
            setCopied(false)
          }
        }}
        className={cn(ICON_BUTTON, className)}
        {...props}
      >
        {children ?? <Icon name={copied ? 'check' : 'copy'} size="sm" />}
        <span className="sr-only" role="status">
          {copied ? 'Copied to clipboard' : ''}
        </span>
      </button>
    )
  },
)
SensitiveInputCopy.displayName = 'SensitiveInputCopy'

export interface SensitiveInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  value?: string
  revealed?: boolean
  defaultRevealed?: boolean
  onRevealedChange?: (revealed: boolean) => void
  showCopy?: boolean
  containerClassName?: string
}

/** The common layout: field, reveal, and optionally copy. */
export const SensitiveInput = React.forwardRef<HTMLInputElement, SensitiveInputProps>(
  ({ containerClassName, revealed, defaultRevealed, onRevealedChange, showCopy = false, disabled, value, defaultValue, onChange, ...props }, ref) => {
    // Track the text so copy works for uncontrolled fields too.
    const [text, setText] = React.useState(String(value ?? defaultValue ?? ''))
    const current = value ?? text
    return (
      <SensitiveInputContainer
        className={containerClassName}
        revealed={revealed}
        defaultRevealed={defaultRevealed}
        onRevealedChange={onRevealedChange}
        disabled={disabled}
        value={current}
      >
        <SensitiveInputField
          ref={ref}
          disabled={disabled}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            setText(e.target.value)
            onChange?.(e)
          }}
          {...props}
        />
        <SensitiveInputReveal />
        {showCopy && <SensitiveInputCopy />}
      </SensitiveInputContainer>
    )
  },
)
SensitiveInput.displayName = 'SensitiveInput'
