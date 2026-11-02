import * as React from 'react'
import { cn } from '../blocks/_cn'

// Plan table: plans as columns, features as grouped rows, so a buyer can check one feature across
// every plan. Follows patterns/plan-comparison-table: neutral ink only, a line check for included, a
// short drawn rule plus hidden text for not included, limits written out, the recommended plan marked by
// one word and a slightly lighter column, never a wider or taller one.
// On phones the table does not scroll sideways: a row of plan buttons picks the one plan column shown
// beside the feature names, and every cell keeps its text for screen readers either way.
// Original code, MIT.

export type PlanCell = boolean | string

export interface PlanColumn {
  id: string
  name: string
  /** Formatted price, for example "$19". */
  price: string
  period?: string
  cta?: { label: string; href: string }
  recommended?: boolean
}

export interface PlanRow {
  label: string
  /** One short line under the label, for terms that need it. */
  note?: string
  values: Record<string, PlanCell>
}

export interface PlanGroup {
  title: string
  rows: PlanRow[]
}

export interface PlanTableProps extends React.HTMLAttributes<HTMLDivElement> {
  plans: PlanColumn[]
  groups: PlanGroup[]
  caption: string
  recommendedLabel?: string
  includedLabel?: string
  notIncludedLabel?: string
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13l4 4 10-10" />
    </svg>
  )
}

function Cell({ value, included, notIncluded }: { value: PlanCell; included: string; notIncluded: string }) {
  if (value === true)
    return (
      <span className="inline-flex h-[1.5em] items-center text-text">
        <Check />
        <span className="sr-only">{included}</span>
      </span>
    )
  if (value === false)
    return (
      <span className="inline-flex h-[1.5em] items-center text-text-subtle">
        <span aria-hidden className="block h-px w-3 bg-current" />
        <span className="sr-only">{notIncluded}</span>
      </span>
    )
  return <span className={cn('text-body tabular-nums text-text', KEEP)}>{value}</span>
}

export function PlanTable({
  plans,
  groups,
  caption,
  recommendedLabel = 'Recommended',
  includedLabel = 'Included',
  notIncludedLabel = 'Not included',
  className,
  ...props
}: PlanTableProps) {
  const initial = plans.find((p) => p.recommended)?.id ?? plans[0]?.id
  const [shown, setShown] = React.useState(initial)
  // A column is hidden below md unless it is the one picked.
  const col = (id: string) => (id === shown ? '' : 'hidden md:table-cell')
  const rec = (p: PlanColumn) => (p.recommended ? 'bg-bg-sunken' : '')

  return (
    <div className={cn('min-w-0', className)} {...props}>
      <div role="group" aria-label="Plan to show" className="mb-4 flex flex-wrap gap-2 md:hidden">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={p.id === shown}
            onClick={() => setShown(p.id)}
            className={cn(
              'h-11 rounded-md border px-4 text-body font-medium outline-none transition-colors duration-press ease-out focus-visible:ring-2 focus-visible:ring-ring',
              p.id === shown ? 'border-text bg-bg-sunken text-text' : 'border-border text-text-muted hover:text-text',
            )}
          >
            {p.name}
          </button>
        ))}
      </div>
      <table className="w-full border-collapse text-left md:table-fixed">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            <td className="w-[44%] p-0 md:w-[30%]" />
            {plans.map((p) => (
              <th key={p.id} scope="col" className={cn('px-4 pb-5 pt-4 align-bottom font-reg', col(p.id), rec(p))}>
                <span className="block h-5 text-label text-text-muted">{p.recommended ? recommendedLabel : ''}</span>
                <span className={cn('mt-1 block text-title font-semibold text-text', KEEP)}>{p.name}</span>
                <span className="mt-1 block text-body tabular-nums text-text-muted">
                  <span className="text-text">{p.price}</span>
                  {p.period ? ` ${p.period}` : ''}
                </span>
                {p.cta ? (
                  <a
                    href={p.cta.href}
                    className={cn(
                      'mt-4 inline-flex h-11 w-full items-center justify-center rounded-md px-3 text-body font-medium outline-none transition-[opacity,colors] duration-press ease-out focus-visible:ring-2 focus-visible:ring-ring desk:h-9',
                      p.recommended ? 'bg-accent text-accent-fg hover:opacity-90' : 'border border-border text-text hover:border-text-subtle',
                    )}
                  >
                    {p.cta.label}
                  </a>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.title}>
            <tr>
              <th scope="colgroup" colSpan={plans.length + 1} className="px-0 pb-2 pt-8 text-label font-medium text-text-subtle">
                {g.title}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={r.label} className="border-b border-border-soft">
                <th scope="row" className="py-3 pr-4 align-top font-reg">
                  <span className={cn('block text-body text-text', KEEP)}>{r.label}</span>
                  {r.note ? <span className={cn('mt-0.5 block text-label text-text-subtle', KEEP)}>{r.note}</span> : null}
                </th>
                {plans.map((p) => (
                  <td key={p.id} className={cn('px-4 py-3 align-top', col(p.id), rec(p))}>
                    <Cell value={r.values[p.id] ?? false} included={includedLabel} notIncluded={notIncludedLabel} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  )
}
