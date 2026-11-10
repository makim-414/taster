'use client'

import * as React from 'react'
import { cn } from './_cn'

// SelectableTable. A data table with row selection and a toolbar: a slot on the left for search and filters,
// and once rows are selected, a count with bulk actions and Clear on the right. The header checkbox selects every
// row on the page and shows the mixed state. Selected rows get one surface step, nothing louder. Columns marked
// `hideBelow="sm"` drop out on phones so the table fits instead of scrolling sideways. Figures align right.

export interface SelectableColumn<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  align?: 'left' | 'right'
  hideBelow?: 'sm' | 'md'
}

export interface SelectableTableProps<T> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  rows: T[]
  columns: SelectableColumn<T>[]
  getRowId: (row: T) => string
  /** Short name of a row for its checkbox label, for example the file name. */
  getRowLabel: (row: T) => string
  selected: string[]
  onSelectedChange: (ids: string[]) => void
  caption: string
  toolbar?: React.ReactNode
  bulkActions?: (ids: string[]) => React.ReactNode
  emptyState?: React.ReactNode
  selectedLabel?: (n: number) => string
  clearLabel?: string
}

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell' }

function Check({
  checked,
  mixed,
  onChange,
  label,
}: {
  checked: boolean
  mixed?: boolean
  onChange: (on: boolean) => void
  label: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(mixed)
  }, [mixed])
  const on = checked || mixed
  return (
    <label className="-m-2 inline-flex size-11 cursor-pointer items-center justify-center desk:size-8">
      <input ref={ref} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          'flex size-4 items-center justify-center rounded-sm border transition-colors duration-press',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-ring',
          on ? 'border-transparent bg-accent text-accent-fg' : 'border-border-input text-transparent',
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-3">
          {mixed ? <path d="M6 12h12" /> : <path d="M5 13l4 4 10-10" />}
        </svg>
      </span>
    </label>
  )
}

export function SelectableTable<T>({
  rows,
  columns,
  getRowId,
  getRowLabel,
  selected,
  onSelectedChange,
  caption,
  toolbar,
  bulkActions,
  emptyState,
  selectedLabel = (n) => `${n} selected`,
  clearLabel = 'Clear',
  className,
  ...props
}: SelectableTableProps<T>) {
  const ids = rows.map(getRowId)
  const chosen = ids.filter((id) => selected.includes(id))
  const all = ids.length > 0 && chosen.length === ids.length
  const some = chosen.length > 0 && !all

  return (
    <div className={cn('flex min-w-0 flex-col gap-3', className)} {...props}>
      {(toolbar || bulkActions) && (
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 basis-64 flex-wrap items-center gap-2">{toolbar}</div>
          {chosen.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm tabular-nums text-text-muted">{selectedLabel(chosen.length)}</span>
              {bulkActions?.(chosen)}
              <button
                type="button"
                onClick={() => onSelectedChange(selected.filter((id) => !ids.includes(id)))}
                className={cn(
                  'inline-flex h-11 items-center rounded-md px-2 text-sm text-text-muted underline underline-offset-4 outline-none desk:h-9',
                  'transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                {clearLabel}
              </button>
            </div>
          )}
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {chosen.length ? selectedLabel(chosen.length) : ''}
      </span>
      <div className="min-w-0 border-y border-border">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-10 py-2 pl-3 pr-1 text-left">
                <Check
                  checked={all}
                  mixed={some}
                  onChange={() => onSelectedChange(all ? selected.filter((id) => !ids.includes(id)) : Array.from(new Set([...selected, ...ids])))}
                  label="Select all rows"
                />
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'px-3 py-2 text-label font-medium text-text-muted',
                    c.align === 'right' ? 'text-right' : 'text-left',
                    c.hideBelow && HIDE[c.hideBelow],
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-6 text-text-muted">
                  {emptyState ?? 'No rows'}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const id = getRowId(r)
                const on = selected.includes(id)
                return (
                  <tr key={id} aria-selected={on} className={cn('transition-colors duration-press', on && 'bg-bg-elev')}>
                    <td className="py-1.5 pl-3 pr-1">
                      <Check
                        checked={on}
                        onChange={(v) => onSelectedChange(v ? [...selected, id] : selected.filter((x) => x !== id))}
                        label={`Select ${getRowLabel(r)}`}
                      />
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cn(
                          'px-3 py-2 text-text',
                          c.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                          c.hideBelow && HIDE[c.hideBelow],
                        )}
                      >
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
