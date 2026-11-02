import * as React from 'react'
import { cn } from '../blocks/_cn'

// Code block: preformatted code on the sunken surface with a header row that names the file or the
// language and holds one Copy button. The button says "Copied" for a moment after a copy and announces it,
// falls back to selecting the text when the clipboard is not available, and is a real 44px target on touch.
// Optional line numbers are drawn with CSS counters, so they are not copied with the code.
// The mono face is set on the code only; the header label stays in the interface face (AC-09). Long lines
// scroll inside the block by default, or wrap with `wrap`. No window dots, no fake terminal (CMP-07).
// Highlighting is out of scope: pass already highlighted children if you have them.
// Original code, MIT.

export interface CodeBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  code: string
  /** File name or language, shown in the header, for example "tailwind.config.cjs". */
  label?: string
  /** Language for the code element class, for example "ts". */
  language?: string
  lineNumbers?: boolean
  wrap?: boolean
  copyLabel?: string
  copiedLabel?: string
  /** Highlighted markup to show instead of the plain `code`; `code` is still what gets copied. */
  children?: React.ReactNode
}

export function CodeBlock({
  code,
  label,
  language,
  lineNumbers = false,
  wrap = false,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  children,
  className,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)
  const pre = React.useRef<HTMLPreElement>(null)
  const timer = React.useRef<number>()
  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // No clipboard permission: select the code so the reader can copy it by hand.
      const sel = window.getSelection()
      if (pre.current && sel) {
        const r = document.createRange()
        r.selectNodeContents(pre.current)
        sel.removeAllRanges()
        sel.addRange(r)
      }
    }
  }

  const lines = code.replace(/\n$/, '').split('\n')
  return (
    <figure className={cn('m-0 min-w-0 overflow-hidden rounded-md bg-bg-sunken', className)} {...props}>
      <figcaption className="flex min-h-11 items-center justify-between gap-3 border-b border-border-soft pl-4 pr-1">
        <span className="min-w-0 truncate text-label text-text-muted">{label ?? language ?? ''}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm px-3 text-label font-medium text-text-muted outline-none transition-colors duration-press ease-out hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:h-8"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {copied ? (
              <path d="M5 13l4 4 10-10" />
            ) : (
              <>
                <rect x="8" y="8" width="12" height="12" rx="2" />
                <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
              </>
            )}
          </svg>
          <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
        </button>
      </figcaption>
      <pre
        ref={pre}
        tabIndex={0}
        aria-label={label ? `Code: ${label}` : 'Code'}
        className={cn(
          'm-0 overflow-x-auto p-4 text-label leading-[var(--lh-normal)] text-text outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          wrap ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : 'whitespace-pre',
        )}
      >
        <code className={cn(language && `language-${language}`, lineNumbers && !children && '[counter-reset:line]') || undefined}>
          {children ??
            (lineNumbers
              ? lines.map((l, i) => (
                  <span key={i} className="block before:mr-4 before:inline-block before:w-[2ch] before:select-none before:text-right before:text-text-subtle before:content-[counter(line)] [counter-increment:line]">
                    {l || ' '}
                  </span>
                ))
              : code)}
        </code>
      </pre>
    </figure>
  )
}
