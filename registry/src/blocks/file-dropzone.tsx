'use client'

import * as React from 'react'
import { cn } from './_cn'

// FileDropzone. A drop target that is also a real file input: drag files in, or tab to it and press Enter or Space
// to open the picker. Accepted files are listed with their size and a remove button; files that break `accept` or
// `maxSize` are listed with the reason in plain words. Only a small mark carries the danger color.

export interface FileDropzoneProps {
  label: React.ReactNode
  hint?: React.ReactNode
  /** Same syntax as the input attribute, for example ".csv,.xlsx" or "image/*". */
  accept?: string
  multiple?: boolean
  /** Largest file in bytes. */
  maxSize?: number
  defaultFiles?: File[]
  onFilesChange?: (files: File[]) => void
  disabled?: boolean
  className?: string
  /** Wording, so the component can be translated. */
  dropLabel?: string
  browseLabel?: string
  removeLabel?: (name: string) => string
}

interface Rejected {
  file: File
  reason: string
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`
  return `${Math.round(n / (1024 * 102.4)) / 10} MB`
}

function matchesAccept(file: File, accept?: string): boolean {
  if (!accept) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return accept
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      if (rule.startsWith('.')) return name.endsWith(rule)
      if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
      return type === rule
    })
}

export function FileDropzone({
  label,
  hint,
  accept,
  multiple = true,
  maxSize,
  defaultFiles = [],
  onFilesChange,
  disabled,
  className,
  dropLabel = 'Drop files here or',
  browseLabel = 'choose files',
  removeLabel = (name) => `Remove ${name}`,
}: FileDropzoneProps) {
  const reactId = React.useId()
  const inputId = `drop-${reactId}`
  const hintId = hint ? `${inputId}-hint` : undefined
  const [files, setFiles] = React.useState<File[]>(defaultFiles)
  const [rejected, setRejected] = React.useState<Rejected[]>([])
  const [over, setOver] = React.useState(false)

  const update = (next: File[]) => {
    setFiles(next)
    onFilesChange?.(next)
  }

  const add = (list: FileList | null) => {
    if (!list) return
    const ok: File[] = []
    const bad: Rejected[] = []
    for (const f of Array.from(list)) {
      if (!matchesAccept(f, accept)) bad.push({ file: f, reason: `Not an accepted type (${accept})` })
      else if (maxSize && f.size > maxSize) bad.push({ file: f, reason: `Larger than ${formatBytes(maxSize)}` })
      else ok.push(f)
    }
    setRejected(bad)
    if (ok.length) update(multiple ? [...files, ...ok] : ok.slice(0, 1))
  }

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-2', className)}>
      <div className="text-sm font-medium text-text" id={`${inputId}-label`}>
        {label}
      </div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          if (disabled) return
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (disabled) return
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
        className={cn(
          'flex min-h-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-6 text-center text-sm',
          'transition-colors duration-press has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          over ? 'border-text bg-bg-sunken' : 'border-border-input hover:border-text-subtle',
        )}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          aria-labelledby={`${inputId}-label`}
          aria-describedby={hintId}
          onChange={(e) => {
            add(e.target.files)
            e.target.value = ''
          }}
          className="sr-only"
        />
        <span className="text-text-muted">
          {dropLabel} <span className="font-medium text-text underline underline-offset-4">{browseLabel}</span>
        </span>
        {hint && (
          <span id={hintId} className="text-label text-text-subtle">
            {hint}
          </span>
        )}
      </label>

      {(files.length > 0 || rejected.length > 0) && (
        <ul className="divide-y divide-border" aria-live="polite">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex min-h-11 items-center gap-3 py-1">
              <span className="min-w-0 flex-1 break-all text-sm text-text">{f.name}</span>
              <span className="shrink-0 text-label tabular-nums text-text-subtle">{formatBytes(f.size)}</span>
              <button
                type="button"
                aria-label={removeLabel(f.name)}
                onClick={() => update(files.filter((_, j) => j !== i))}
                className={cn(
                  '-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-subtle outline-none desk:size-8',
                  'transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          ))}
          {rejected.map((r, i) => (
            <li key={`bad-${r.file.name}-${i}`} className="flex min-h-11 items-start gap-2 py-2.5 text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true" className="mt-1 shrink-0 text-danger">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5.5M12 16.5h.01" />
              </svg>
              <span className="min-w-0 break-all text-text">
                {r.file.name}
                <span className="text-text-muted">: {r.reason}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
