import * as React from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { cn } from './_cn'

// DataGrid. Sortable, paginated table built on @tanstack/react-table (shadcn/ui pattern, MIT).
// Numeric columns are right aligned with tabular numerals.
// Upstream license: MIT, Copyright (c) 2023 shadcn. Full text in THIRD_PARTY_NOTICES.md.

export interface DataGridProps<T> {
  columns: ColumnDef<T, any>[]
  data: T[]
  pageSize?: number
  className?: string
}

function SortGlyph({ dir }: { dir: false | 'asc' | 'desc' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={cn('shrink-0', dir ? 'text-text' : 'text-text-subtle')} aria-hidden>
      {dir === 'asc' ? <path d="M7 14l5-5 5 5" /> : dir === 'desc' ? <path d="M7 10l5 5 5-5" /> : <path d="M8 10l4-4 4 4M8 14l4 4 4-4" />}
    </svg>
  )
}

export function DataGrid<T>({ columns, data, pageSize = 5, className }: DataGridProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })
  const pageBtn =
    'min-h-11 rounded-md border border-border px-2.5 py-1 text-caption desk:min-h-0 text-text-muted transition-colors hover:border-text-subtle hover:text-text disabled:opacity-40 disabled:pointer-events-none'
  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-bg-sunken">
                {hg.headers.map((header) => {
                  const align = (header.column.columnDef.meta as any)?.align === 'right'
                  const sortable = header.column.getCanSort()
                  return (
                    <th key={header.id} className={cn('px-3 py-0 text-caption font-medium text-text-subtle desk:py-2.5', align ? 'text-right' : 'text-left')}>
                      <button
                        type="button"
                        disabled={!sortable}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn('inline-flex min-h-11 items-center gap-1.5 desk:min-h-0', align && 'flex-row-reverse', sortable && 'cursor-pointer hover:text-text')}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortable && <SortGlyph dir={header.column.getIsSorted()} />}
                      </button>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-border-soft last:border-0 hover:bg-bg-elev">
                {row.getVisibleCells().map((cell) => {
                  const align = (cell.column.columnDef.meta as any)?.align === 'right'
                  return (
                    <td key={cell.id} className={cn('px-3 py-2.5 text-text-muted', align ? 'text-right tabular-nums' : 'text-left')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-caption text-text-subtle">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} · {data.length} rows
        </span>
        <div className="flex gap-1.5">
          <button className={pageBtn} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </button>
          <button className={pageBtn} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
