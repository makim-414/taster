import * as React from 'react'
import { cn } from './_cn'
import { Sparkline } from './spark'

// SparklineTable. A compact table where each row carries its own trend: name, current figure, change and a
// sparkline drawn from the row's series. Figures are right aligned in tabular numerals so they line up; the
// sparkline is neutral unless a row's change has a direction worth showing. Each line gets a text alternative.
// Below sm the change column folds under the figure so nothing scrolls sideways.

export interface SparklineRow {
  id: string
  label: string
  value: string
  change?: { value: string; dir: 'up' | 'down' | 'flat' }
  series: number[]
}

export interface SparklineTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows: SparklineRow[]
  caption: string
  labelHeader?: string
  valueHeader?: string
  changeHeader?: string
  trendHeader?: string
  /** Color the line by the row's direction. Off keeps every line neutral. */
  colorByDirection?: boolean
}

const WORD = { up: 'up', down: 'down', flat: 'unchanged' }

export function SparklineTable({
  rows,
  caption,
  labelHeader = 'Name',
  valueHeader = 'Value',
  changeHeader = 'Change',
  trendHeader = 'Trend',
  colorByDirection = false,
  className,
  ...props
}: SparklineTableProps) {
  return (
    <div className={cn('min-w-0 border-y border-border', className)} {...props}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-label text-text-muted">
            <th scope="col" className="px-3 py-2 text-left font-medium">{labelHeader}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{valueHeader}</th>
            <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">{changeHeader}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{trendHeader}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const dir = r.change && r.change.dir !== 'flat' && colorByDirection ? r.change.dir : undefined
            const changeText = r.change ? `${WORD[r.change.dir]} ${r.change.value}` : ''
            return (
              <tr key={r.id}>
                <th scope="row" className="px-3 py-2.5 text-left font-normal text-text">{r.label}</th>
                <td className="px-3 py-2.5 text-right tabular-nums text-text">
                  {r.value}
                  {r.change && <div className="text-label text-text-muted sm:hidden">{r.change.value}</div>}
                </td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums text-text-muted sm:table-cell">{r.change?.value}</td>
                <td className="px-3 py-1.5 text-right">
                  <Sparkline
                    data={r.series}
                    width={88}
                    height={28}
                    dir={dir}
                    role="img"
                    aria-label={`${r.label} trend${changeText ? `, ${changeText}` : ''}`}
                    className="ml-auto"
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
