import * as React from 'react'
import { cn } from './_cn'

// Data table. Sentence-case headers, hairline separators, numeric cells right aligned with tabular numerals.

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'right'
}

export interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  columns: TableColumn[]
  rows: Record<string, React.ReactNode>[]
}

export const DataTable = React.forwardRef<HTMLDivElement, DataTableProps>(
  ({ columns, rows, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-hidden rounded-lg border border-border bg-bg-elev', className)}
      {...props}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'h-10 px-3 text-xs font-medium text-text-subtle',
                  col.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border-soft transition-colors last:border-b-0 hover:bg-bg-sunken"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'h-10 px-3 text-text',
                    col.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                  )}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
)
DataTable.displayName = 'DataTable'
