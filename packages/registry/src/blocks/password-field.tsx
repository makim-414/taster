'use client'

import * as React from 'react'
import { cn } from './_cn'
import { Icon } from '../icons'
import { SensitiveInputContainer, SensitiveInputField, SensitiveInputReveal } from './sensitive-input'

// Password field: a new password input with a reveal toggle, a thin bar under it that fills as the rules pass, one
// strength word, and a checklist of the rules, each marked met or not met. The field chrome and the show/hide toggle
// come from blocks/sensitive-input, so the reveal behavior lives in one place. The rules, the strength words and every
// label are props, so a Korean sign up form passes its own. See patterns/sign-in-form.md.
// Written for this registry after "Password Input" by uilayout.contact (UI Layouts) on 21st.dev, picked by the owner.
// The license could not be confirmed, so no code was taken; it was written from the preview.
// Changed on purpose: the bar is one segment per rule in neutral steps and turns --brand only when every rule passes,
// instead of a red to green traffic light; the success color stays on the small check icons; each rule says met or
// not met in words for screen readers; the status is a polite live region that speaks only when the strength word
// changes, not on every key; the reveal button keeps one name with aria-pressed and a 44px target; the rules and all
// words are props.

export interface PasswordRule {
  /** Stable key for the checklist. */
  id: string
  /** What the rule asks for, as the checklist shows it. */
  label: string
  /** True when the value meets the rule. */
  test: (value: string) => boolean
  /** Language of the label when it differs from the page, for example 'ko'. */
  lang?: string
}

export interface PasswordStrengthLabels {
  /** Shown while the field is empty. */
  empty: string
  /** Fewer than 60 percent of the rules pass. */
  weak: string
  /** 60 percent or more pass, but not all. */
  medium: string
  /** Every rule passes. */
  strong: string
}

export type PasswordStrength = keyof PasswordStrengthLabels

export const DEFAULT_PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (v) => Array.from(v).length >= 8 },
  { id: 'number', label: 'At least 1 number', test: (v) => /\d/.test(v) },
  { id: 'lowercase', label: 'At least 1 lowercase letter', test: (v) => /\p{Ll}/u.test(v) },
  { id: 'uppercase', label: 'At least 1 uppercase letter', test: (v) => /\p{Lu}/u.test(v) },
  // Anything that is neither a letter nor a digit: punctuation, symbols and spaces.
  { id: 'special', label: 'At least 1 special character', test: (v) => /[^\p{L}\p{N}]/u.test(v) },
]

export const DEFAULT_PASSWORD_STRENGTH_LABELS: PasswordStrengthLabels = {
  empty: 'Enter a password',
  weak: 'Weak password',
  medium: 'Medium password',
  strong: 'Strong password',
}

/** The strength word for a score: strong only when every rule passes, medium from 60 percent. */
export function passwordStrength(score: number, max: number, empty: boolean): PasswordStrength {
  if (empty) return 'empty'
  if (score >= max) return 'strong'
  if (score >= Math.ceil(max * 0.6)) return 'medium'
  return 'weak'
}

// Neutral steps that gain contrast with strength in both themes (the chart ramp flips in light), then the brand
// color once every rule passes. The empty track is the sunken surface.
const TRACK = 'var(--bg-sunken)'
const FILL: Record<PasswordStrength, string> = {
  empty: TRACK,
  weak: 'var(--chart-4)',
  medium: 'var(--chart-2)',
  strong: 'var(--brand)',
}

export interface PasswordFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'defaultValue' | 'onChange' | 'size' | 'className' | 'style'
  > {
  /** Visible label above the field. Default "Password". */
  label?: React.ReactNode
  /** Controlled value. Pair it with onChange or onValueChange. */
  value?: string
  /** Starting value when uncontrolled. */
  defaultValue?: string
  /** The input's change event, so form libraries can register the field as is. */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** The new value as a string. */
  onValueChange?: (value: string) => void
  /** Default "new-password". Use "current-password" on a sign in form (and usually hide the rules there). */
  autoComplete?: string
  /** The checklist. Default: 8 characters, a number, a lowercase, an uppercase and a special character. */
  rules?: readonly PasswordRule[]
  /** Heading of the checklist. Default "Must contain:". */
  requirementsLabel?: React.ReactNode
  /** The strength words; pass only the ones to replace. */
  strengthLabels?: Partial<PasswordStrengthLabels>
  /** Read after each rule by screen readers. Default "met". */
  metLabel?: string
  /** Default "not met". */
  unmetLabel?: string
  /** Name of the reveal toggle; its pressed state says whether the password shows. Default "Show password". */
  revealLabel?: string
  /** Called with the number of rules met and the number of rules, on mount and whenever either changes. */
  onStrengthChange?: (score: number, max: number) => void
  /** Language of the whole field, for example 'ko'. */
  lang?: string
  /** Classes for the outer wrapper. */
  className?: string
  style?: React.CSSProperties
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  {
    label = 'Password',
    value,
    defaultValue,
    onChange,
    onValueChange,
    id,
    autoComplete = 'new-password',
    disabled,
    rules = DEFAULT_PASSWORD_RULES,
    requirementsLabel = 'Must contain:',
    strengthLabels,
    metLabel = 'met',
    unmetLabel = 'not met',
    revealLabel = 'Show password',
    onStrengthChange,
    lang,
    className,
    style,
    'aria-describedby': ownDescribedBy,
    ...inputProps
  },
  ref,
) {
  const reactId = React.useId()
  const inputId = id ?? `password-${reactId}`
  const statusId = `${inputId}-status`
  const headId = `${inputId}-rules-label`
  const listId = `${inputId}-rules`

  const controlled = value !== undefined
  const [inner, setInner] = React.useState(defaultValue ?? '')
  const current = controlled ? value : inner

  const results = React.useMemo(() => rules.map((rule) => ({ rule, met: rule.test(current) })), [rules, current])
  const score = results.filter((r) => r.met).length
  const max = rules.length
  const level = passwordStrength(score, max, current.length === 0)
  const words = { ...DEFAULT_PASSWORD_STRENGTH_LABELS, ...strengthLabels }

  // Keep the latest callback without re-firing when only its identity changes.
  const notify = React.useRef(onStrengthChange)
  React.useEffect(() => {
    notify.current = onStrengthChange
  })
  React.useEffect(() => {
    notify.current?.(score, max)
  }, [score, max])

  // With no rules there is no meter or checklist, only the field.
  const describedBy = [ownDescribedBy, ...(max > 0 ? [statusId, headId, listId] : [])].filter(Boolean).join(' ') || undefined

  return (
    <div lang={lang} className={cn('flex w-full min-w-0 flex-col', className)} style={style}>
      <label htmlFor={inputId} className="text-sm font-medium text-text">
        {label}
      </label>
      <SensitiveInputContainer className="mt-1.5" disabled={disabled}>
        <SensitiveInputField
          {...inputProps}
          ref={ref}
          id={inputId}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-describedby={describedBy}
          {...(controlled ? { value } : { defaultValue })}
          onChange={(e) => {
            if (!controlled) setInner(e.target.value)
            onChange?.(e)
            onValueChange?.(e.target.value)
          }}
        />
        {/* 44px on touch screens already; on a desk screen the button draws at 36px and the pseudo element keeps
            the hit area at 44px. */}
        <SensitiveInputReveal aria-label={revealLabel} className="relative desk:after:absolute desk:after:-inset-1" />
      </SensitiveInputContainer>

      {max > 0 && (
        <>
          {/* The bar repeats the status word and the checklist, so it is hidden from screen readers. Each segment
              is a small SVG rather than an empty colored box, so a form around the field does not read as a drawn
              mockup (AC-17). rx is half the 4px height, for round ends. */}
          <div aria-hidden="true" className="mt-2 flex h-1 gap-1">
            {results.map(({ rule }, i) => (
              <svg key={rule.id} focusable="false" className="h-full min-w-0 flex-1">
                <rect
                  width="100%"
                  height="100%"
                  rx="2"
                  className="transition-colors duration-dropdown ease-out"
                  style={{ fill: i < score ? FILL[level] : TRACK }}
                />
              </svg>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p id={headId} className="text-label font-medium text-text">
              {requirementsLabel}
            </p>
            {/* Only the word lives here, so the region speaks when the word changes, not on every key. */}
            <p id={statusId} aria-live="polite" aria-atomic="true" className="text-label text-text-muted">
              {words[level]}
            </p>
          </div>

          <ul id={listId} aria-labelledby={headId} className="mt-2 flex flex-col gap-1.5">
            {results.map(({ rule, met }) => (
              <li
                key={rule.id}
                lang={rule.lang}
                className={cn('flex items-start gap-2 text-label', met ? 'text-text' : 'text-text-muted')}
              >
                {/* Icon centered on the first line of the label, so a wrapped rule keeps it on line one. */}
                <span
                  aria-hidden="true"
                  className={cn('flex h-[1lh] flex-none items-center', met ? 'text-success' : 'text-text-subtle')}
                >
                  <Icon name={met ? 'check' : 'close'} size={14} />
                </span>
                <span className="min-w-0">
                  {rule.label}
                  <span className="sr-only">, {met ? metLabel : unmetLabel}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
})
PasswordField.displayName = 'PasswordField'
