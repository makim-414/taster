import * as React from 'react'
import { cn } from '../blocks/_cn'

// Usage estimator: presets and one to four usage inputs on one side, the monthly total and its line items
// on the other, updated on every change. Each slider is paired with a number field, values are clamped to
// the allowed range and the clamp is said in words, and the total keeps the last valid value while a
// field is being edited, so it never shows zero, NaN or an empty slot.
// Follows patterns/usage-cost-estimator. The rates are props: nothing here invents a price or a saving.
// Original code, MIT.

export interface UsageMeter {
  id: string
  label: string
  /** Unit shown after the value, for example "seats" or "requests". */
  unit: string
  min: number
  max: number
  step?: number
  /** Units included in the base fee. */
  included: number
  /** Price of one unit above the included amount. */
  rate: number
  /** Optional per-unit wording for the breakdown, for example "per 1,000 requests". */
  rateLabel?: string
  /** Units the rate is quoted for. Default 1. With 1000, the rate is per thousand units. */
  per?: number
}

export interface UsagePreset {
  label: string
  values: Record<string, number>
}

export interface UsageEstimatorProps extends React.HTMLAttributes<HTMLDivElement> {
  meters: UsageMeter[]
  presets: UsagePreset[]
  /** Monthly base fee. */
  base: number
  baseLabel?: string
  /** Formats a money amount. Default USD with no cents for whole numbers. */
  format?: (n: number) => string
  period?: string
  /** One sentence that names the plan that fits these values and why. */
  hint?: (values: Record<string, number>, total: number) => React.ReactNode
  /** Assumptions and the date the rates were last updated. */
  footnote?: React.ReactNode
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const defaultFormat = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n)

const CSS_RANGE =
  // The pseudo-element goes first, so the ring lands on :focus-visible::thumb (the other order never matches).
  'h-11 w-full cursor-pointer appearance-none bg-transparent outline-none [&::-webkit-slider-thumb]:focus-visible:ring-2 [&::-moz-range-thumb]:focus-visible:ring-2 ' +
  '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-pill [&::-webkit-slider-runnable-track]:bg-[color:var(--border)] ' +
  '[&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-pill ' +
  '[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-border [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:ring-ring ' +
  '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-pill [&::-moz-range-track]:bg-[color:var(--border)] ' +
  '[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-pill [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-text [&::-moz-range-thumb]:ring-ring'

function clamp(v: number, m: UsageMeter) {
  return Math.min(m.max, Math.max(m.min, v))
}

export function UsageEstimator({
  meters,
  presets,
  base,
  baseLabel = 'Base fee',
  format = defaultFormat,
  period = 'per month',
  hint,
  footnote,
  className,
  ...props
}: UsageEstimatorProps) {
  const [preset, setPreset] = React.useState(0)
  const [values, setValues] = React.useState<Record<string, number>>(() => ({ ...presets[0]?.values }))
  // Raw text of each number field, so a half typed value does not reset the total.
  const [drafts, setDrafts] = React.useState<Record<string, string | undefined>>({})
  const [clamped, setClamped] = React.useState<Record<string, boolean>>({})
  const uid = React.useId()

  function setValue(m: UsageMeter, v: number) {
    const c = clamp(v, m)
    setClamped((s) => ({ ...s, [m.id]: c !== v }))
    setValues((s) => ({ ...s, [m.id]: c }))
    setPreset(-1)
  }

  function pick(i: number) {
    setPreset(i)
    setValues({ ...presets[i].values })
    setDrafts({})
    setClamped({})
  }

  const lines = meters.map((m) => {
    const v = values[m.id] ?? m.min
    const over = Math.max(0, v - m.included)
    const cost = (over / (m.per ?? 1)) * m.rate
    return { m, v, over, cost }
  })
  const total = base + lines.reduce((s, l) => s + l.cost, 0)

  return (
    <div className={cn('grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12', className)} {...props}>
      <div className="min-w-0">
        <div role="group" aria-label="Typical usage" className="flex flex-wrap gap-2">
          {presets.map((p, i) => (
            <button
              key={p.label}
              type="button"
              aria-pressed={preset === i}
              onClick={() => pick(i)}
              className={cn(
                'h-11 rounded-md border px-4 text-body font-medium outline-none transition-colors duration-press ease-out focus-visible:ring-2 focus-visible:ring-ring desk:h-9',
                preset === i ? 'border-text bg-bg-sunken text-text' : 'border-border text-text-muted hover:text-text',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-8">
          {lines.map(({ m, v }) => {
            const id = `${uid}-${m.id}`
            return (
              <div key={m.id}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <label htmlFor={id} className={cn('text-body font-medium text-text', KEEP)}>
                    {m.label}
                  </label>
                  <span className="flex items-center gap-2">
                    <input
                      id={id}
                      type="number"
                      inputMode="numeric"
                      min={m.min}
                      max={m.max}
                      step={m.step ?? 1}
                      value={drafts[m.id] ?? String(v)}
                      onChange={(e) => {
                        const raw = e.target.value
                        setDrafts((s) => ({ ...s, [m.id]: raw }))
                        const n = Number(raw)
                        if (raw.trim() !== '' && Number.isFinite(n)) setValue(m, n)
                      }}
                      onBlur={() => setDrafts((s) => ({ ...s, [m.id]: undefined }))}
                      aria-describedby={`${id}-range`}
                      className="h-11 w-24 rounded-md border border-border-input bg-transparent px-3 text-right text-body tabular-nums text-text outline-none focus-visible:ring-2 focus-visible:ring-ring desk:h-9"
                    />
                    <span className="text-label text-text-muted">{m.unit}</span>
                  </span>
                </div>
                <input
                  type="range"
                  aria-label={`${m.label}, slider`}
                  min={m.min}
                  max={m.max}
                  step={m.step ?? 1}
                  value={v}
                  onChange={(e) => {
                    setDrafts((s) => ({ ...s, [m.id]: undefined }))
                    setValue(m, Number(e.target.value))
                  }}
                  className={cn('mt-1', CSS_RANGE)}
                />
                <p id={`${id}-range`} className="text-label tabular-nums text-text-subtle">
                  {clamped[m.id]
                    ? `Set to the ${v === m.max ? 'maximum' : 'minimum'} of ${v.toLocaleString('en-US')}.`
                    : `${m.min.toLocaleString('en-US')} to ${m.max.toLocaleString('en-US')}. ${m.included.toLocaleString('en-US')} included.`}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="min-w-0 rounded-xl bg-bg-sunken p-6 lg:p-8" aria-live="polite">
        <p className="text-label text-text-muted">Estimated total</p>
        <p className="mt-1 text-h1 font-semibold tabular-nums text-text">
          {format(total)} <span className="text-body font-reg text-text-muted">{period}</span>
        </p>
        <dl className="m-0 mt-6 grid gap-2 border-t border-border pt-4 text-body">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">{baseLabel}</dt>
            <dd className="m-0 tabular-nums text-text">{format(base)}</dd>
          </div>
          {lines.map(({ m, over, cost }) => (
            <div key={m.id} className="flex justify-between gap-4">
              <dt className={cn('text-text-muted', KEEP)}>
                {m.label}: {over > 0 ? `${over.toLocaleString('en-US')} over the included ${m.included.toLocaleString('en-US')}` : 'within the included amount'}
                {over > 0 && m.rateLabel ? `, ${format(m.rate)} ${m.rateLabel}` : ''}
              </dt>
              <dd className="m-0 shrink-0 tabular-nums text-text">{format(cost)}</dd>
            </div>
          ))}
        </dl>
        {hint ? <p className={cn('mt-6 text-body text-text', KEEP)}>{hint(values, total)}</p> : null}
        {footnote ? <p className={cn('mt-4 text-label text-text-subtle', KEEP)}>{footnote}</p> : null}
      </div>
    </div>
  )
}
