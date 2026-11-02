import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useStyleOnce } from '../motion/_motion'

// Tool call: one line in a chat thread for each action the assistant took, closed by default. A status
// shape at the start (a small spinner while running, a check when done, a crossed circle when it failed,
// so the state is never told by color alone), a human verb ("Searched the web"), a muted summary on the
// same line, the elapsed time for calls over two seconds, and a chevron. Open, it shows the arguments and
// the result in the mono face inside a bounded block with its own scroll. ToolCallGroup folds a run of
// calls under one "Used 4 tools" line.
// Built on native <details>, so the summary is a real disclosure button with no dependency.
// Follows patterns/tool-call-disclosure: no card with an icon tile per call (CMP-03), no pulsing colored
// dot (AC-08), no tinted status pill (AC-04), mono for arguments only (AC-09).
// Original code, MIT.

export type ToolStatus = 'running' | 'done' | 'failed'

export interface ToolCallProps extends Omit<React.HTMLAttributes<HTMLDetailsElement>, 'title'> {
  status: ToolStatus
  /** Human verb and object, for example "Searched the web". */
  title: string
  /** Short result on the same line, for example "12 results for late suppliers". */
  summary?: string
  /** Arguments as shown to the person, with secrets already removed. */
  args?: string
  result?: string
  /** Elapsed milliseconds; shown when over 2000. */
  elapsedMs?: number
  defaultOpen?: boolean
}

const CSS =
  '@keyframes dsg-spin{to{transform:rotate(360deg)}}' +
  '.dsg-spin{animation:dsg-spin 800ms linear infinite}' +
  '@media (prefers-reduced-motion: reduce){.dsg-spin{animation-duration:2400ms}}' +
  '.dsg-tool>summary::-webkit-details-marker{display:none}'

const KEEP = 'break-keep [overflow-wrap:break-word]'

export function StatusMark({ status }: { status: ToolStatus }) {
  useStyleOnce('dsg-tool-css', CSS)
  if (status === 'running')
    return (
      <span aria-hidden className="dsg-spin inline-block h-3.5 w-3.5 shrink-0 rounded-pill border-2 border-border border-t-text" />
    )
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-text-muted">
      {status === 'done' ? (
        <path d="M5 13l4 4 10-10" />
      ) : (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
        </>
      )}
    </svg>
  )
}

const STATUS_TEXT: Record<ToolStatus, string> = { running: 'Running', done: 'Done', failed: 'Failed' }

export function ToolCall({ status, title, summary, args, result, elapsedMs, defaultOpen, className, ...props }: ToolCallProps) {
  useStyleOnce('dsg-tool-css', CSS)
  const body = args || result
  return (
    <details open={defaultOpen} className={cn('dsg-tool group min-w-0 [&:not([open])>:not(summary)]:hidden', className)} {...props}>
      <summary
        className={cn(
          'flex min-h-11 list-none items-center gap-3 rounded-sm py-1 text-body outline-none focus-visible:ring-2 focus-visible:ring-ring desk:min-h-9',
          body ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <StatusMark status={status} />
        <span className="sr-only">{STATUS_TEXT[status]}: </span>
        <span className="min-w-0 flex-1">
          <span className={cn('font-medium text-text', KEEP)}>{title}</span>
          {summary ? <span className={cn('ml-2 text-text-muted', KEEP)}>{summary}</span> : null}
        </span>
        {elapsedMs !== undefined && elapsedMs > 2000 ? (
          <span className="shrink-0 text-label tabular-nums text-text-subtle">{(elapsedMs / 1000).toFixed(1)} s</span>
        ) : null}
        {body ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-text-subtle transition-transform duration-dropdown ease-out group-open:rotate-180">
            <path d="m6 9 6 6 6-6" />
          </svg>
        ) : null}
      </summary>
      {body ? (
        <div className="mb-2 ml-7 mt-1 grid gap-3">
          {args ? (
            <div>
              <p className="mb-1 text-label text-text-subtle">Input</p>
              <pre className="m-0 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-bg-sunken p-3 text-label text-text [overflow-wrap:anywhere]">{args}</pre>
            </div>
          ) : null}
          {result ? (
            <div>
              <p className="mb-1 text-label text-text-subtle">{status === 'failed' ? 'Error' : 'Result'}</p>
              <pre className="m-0 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-bg-sunken p-3 text-label text-text [overflow-wrap:anywhere]">{result}</pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </details>
  )
}

export interface ToolCallGroupProps extends React.HTMLAttributes<HTMLDetailsElement> {
  /** For example "Used 4 tools". */
  label: string
  /** Running if any call runs, failed if any failed, else done. */
  status: ToolStatus
  children: React.ReactNode
  defaultOpen?: boolean
}

export function ToolCallGroup({ label, status, children, defaultOpen, className, ...props }: ToolCallGroupProps) {
  useStyleOnce('dsg-tool-css', CSS)
  return (
    <details open={defaultOpen} className={cn('dsg-tool group/g min-w-0 [&:not([open])>:not(summary)]:hidden', className)} {...props}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-sm py-1 text-body outline-none focus-visible:ring-2 focus-visible:ring-ring desk:min-h-9">
        <StatusMark status={status} />
        <span className="sr-only">{STATUS_TEXT[status]}: </span>
        <span className="flex-1 font-medium text-text">{label}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-text-subtle transition-transform duration-dropdown ease-out group-open/g:rotate-180">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="ml-1.5 border-l border-border pl-5">{children}</div>
    </details>
  )
}
