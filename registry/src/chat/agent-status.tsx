import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useStyleOnce } from '../motion/_motion'

// Agent status: the line that says what the assistant is doing right now, placed where the next reply
// will appear so nothing jumps when text starts. A small neutral spinner, the current step written as a
// present participle with an object ("Comparing two price lists"), the elapsed time once the run passes
// ten seconds, and a Stop button that is always in reach. For long runs, `steps` shows the earlier steps
// above the line, dimmed and still, newest at the bottom.
// role="status" announces step changes, not every tick of the clock. Under reduced motion the spinner
// turns slowly instead of fast.
// Follows patterns/agent-status-line: no orange glowing pill (AC-07), no pulsing colored dot (AC-08), no
// gradient orb (COL-01, BG-01), no invented steps (CPY-01). The text shimmer that pattern mentions is left
// out on purpose: a gradient on glyphs reads as gradient text (COL-04).
// Original code, MIT.

export interface AgentStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The step running now. */
  step: string
  /** Earlier steps of this run, oldest first. */
  steps?: string[]
  /** Date.now() when the run started. */
  startedAt?: number
  onStop?: () => void
  stopLabel?: string
}

const CSS =
  '@keyframes dsg-spin{to{transform:rotate(360deg)}}' +
  '.dsg-spin{animation:dsg-spin 800ms linear infinite}' +
  '@media (prefers-reduced-motion: reduce){.dsg-spin{animation-duration:2400ms}}'

const KEEP = 'break-keep [overflow-wrap:break-word]'

function useElapsed(startedAt?: number) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (startedAt === undefined) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [startedAt])
  return startedAt === undefined ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
}

function clock(s: number) {
  const m = Math.floor(s / 60)
  return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
}

export function AgentStatus({ step, steps = [], startedAt, onStop, stopLabel = 'Stop', className, ...props }: AgentStatusProps) {
  useStyleOnce('dsg-agent-css', CSS)
  const secs = useElapsed(startedAt)
  return (
    <div className={cn('min-w-0', className)} {...props}>
      {steps.length ? (
        <ol className="m-0 mb-1 grid list-none gap-1 p-0" aria-label="Earlier steps">
          {steps.map((s, i) => (
            <li key={`${i}-${s}`} className={cn('flex items-center gap-3 text-body text-text-subtle', KEEP)}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
                <path d="M5 13l4 4 10-10" />
              </svg>
              {s}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="flex min-h-11 items-center gap-3">
        <span aria-hidden className="dsg-spin inline-block h-3.5 w-3.5 shrink-0 rounded-pill border-2 border-border border-t-text" />
        <p role="status" className={cn('min-w-0 flex-1 text-body text-text-muted', KEEP)}>
          {step}
        </p>
        {secs >= 10 ? <span className="shrink-0 text-label tabular-nums text-text-subtle">{clock(secs)}</span> : null}
        {onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-border px-3 text-label font-medium text-text outline-none transition-colors duration-press ease-out hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-ring desk:h-8"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden>
              <rect x="5" y="5" width="14" height="14" rx="1.5" />
            </svg>
            {stopLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
