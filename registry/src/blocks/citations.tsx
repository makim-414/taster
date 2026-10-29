import * as React from 'react'
import { cn } from './_cn'
import { useReducedMotion, useStyleOnce } from '../motion/_motion'

// Citations: numbered markers inside an answer, and a sources list under it that opens and closes.
// New sources slide in as they arrive, so it works while an agent is still streaming.
// Source: "Citations" from beUI (https://beui.dev/components/agents/citations,
// https://github.com/starc007/ui-components) by Saurabh Chauhan.
// Changes: no motion or lucide dependency (CSS transitions and the registry icon strokes), tokens
// for every color, favicons are opt-in (default is the domain initial, so the page makes no
// requests to third-party sites), list rows are 44px on touch, and the list is open by default:
// patterns/sourced-answer-block.md says sources should not hide.
// Upstream license: MIT, Copyright (c) 2026 Saurabh Chauhan. Full text in THIRD_PARTY_NOTICES.md.

export interface CitationItem {
  id: string
  title: React.ReactNode
  /** Shown after the title, and used for the initial when there is no favicon. */
  domain?: string
  url?: string
}

const targetId = (prefix: string, id: string) => `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`

const CSS = `
@keyframes ds-cite-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
.ds-cite-row { animation: ds-cite-in 220ms var(--ease-out) both }
@media (prefers-reduced-motion: reduce) { .ds-cite-row { animation: none } }
`

const Stroke = ({ d, className }: { d: string; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="var(--icon-stroke, 2)"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    dangerouslySetInnerHTML={{ __html: d }}
  />
)

export interface CitationProps {
  citationId: string
  /** The number the reader sees, 1-based. */
  index: number
  /** Must match the idPrefix of the Citations list it points to. */
  idPrefix: string
  className?: string
}

/** Inline marker inside the answer text. Jumps to the matching row. */
export function Citation({ citationId, index, idPrefix, className }: CitationProps) {
  return (
    <a
      href={`#${targetId(idPrefix, citationId)}`}
      aria-label={`Source ${index}`}
      className={cn(
        'mx-0.5 inline-flex min-w-[1.25rem] -translate-y-0.5 items-center justify-center rounded-sm bg-bg-elev px-1 py-0.5 tabular-nums text-caption leading-none text-text-muted no-underline outline-none',
        'transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {index}
    </a>
  )
}

function SourceMark({ item, favicons }: { item: CitationItem; favicons: boolean }) {
  const [failed, setFailed] = React.useState(false)
  let host = ''
  try {
    host = item.url ? new URL(item.url).hostname : ''
  } catch {
    host = ''
  }
  const initial = (item.domain || host || '?').replace(/^www\./, '').charAt(0).toUpperCase()
  return (
    <span aria-hidden="true" className="grid h-5 w-5 flex-none place-items-center rounded-sm bg-bg-elev tabular-nums text-caption text-text-muted">
      {favicons && host && !failed ? (
        <img
          src={`https://${host}/favicon.ico`}
          alt=""
          width={16}
          height={16}
          referrerPolicy="no-referrer"
          className="h-4 w-4 rounded-sm object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  )
}

export interface CitationListProps {
  citations: CitationItem[]
  idPrefix: string
  /** Load each site's favicon. Off by default: it sends a request to every cited site. */
  favicons?: boolean
  className?: string
}

export function CitationList({ citations, idPrefix, favicons = false, className }: CitationListProps) {
  useStyleOnce('ds-citations', CSS)
  return (
    <ol className={cn('grid gap-0.5', className)}>
      {citations.map((c, i) => {
        const body = (
          <>
            <SourceMark item={c} favicons={favicons} />
            <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
              <span className="truncate text-sm text-text">{c.title}</span>
              {c.domain ? <span className="truncate text-caption text-text-subtle">{c.domain}</span> : null}
            </span>
            <span className="tabular-nums text-caption tabular-nums text-text-subtle">{i + 1}</span>
            {c.url ? <Stroke d='<path d="M7 17 17 7"/><path d="M8 7h9v9"/>' className="h-3.5 w-3.5 flex-none text-text-subtle" /> : null}
          </>
        )
        const row = 'flex min-h-11 items-center gap-2 rounded-md px-1.5 outline-none desk:min-h-8 focus-visible:ring-2 focus-visible:ring-ring'
        const id = targetId(idPrefix, c.id)
        return (
          <li key={c.id} className="ds-cite-row">
            {c.url ? (
              <a id={id} href={c.url} target="_blank" rel="noreferrer noopener" className={cn(row, 'transition-colors hover:bg-bg-elev')}>
                {body}
              </a>
            ) : (
              <div id={id} className={row}>
                {body}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export interface CitationsProps {
  citations: CitationItem[]
  title?: React.ReactNode
  open?: boolean
  /** Default true. Sources are evidence; keep them visible unless space is very tight. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Shared with the inline Citation markers. Generated when omitted. */
  idPrefix?: string
  favicons?: boolean
  className?: string
}

export function Citations({
  citations,
  title = 'Sources',
  open,
  defaultOpen = true,
  onOpenChange,
  idPrefix,
  favicons,
  className,
}: CitationsProps) {
  const reduced = useReducedMotion()
  const baseId = React.useId().replace(/:/g, '')
  const prefix = idPrefix ?? `cite-${baseId}`
  const contentId = `${baseId}-sources`
  const [inner, setInner] = React.useState(defaultOpen)
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const isOpen = open ?? inner
  // Closed rows leave the tab order. React 18 types have no inert prop, so it is set on the node.
  React.useEffect(() => {
    bodyRef.current?.toggleAttribute('inert', !isOpen)
  }, [isOpen])
  const toggle = () => {
    if (open === undefined) setInner(!isOpen)
    onOpenChange?.(!isOpen)
  }

  return (
    <div className={cn('w-full text-sm', className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={toggle}
        className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:min-h-8"
      >
        <span className="font-medium">{title}</span>
        <span className="tabular-nums text-caption tabular-nums text-text-subtle">{citations.length}</span>
        <Stroke
          d='<path d="m6 9 6 6 6-6"/>'
          className={cn('h-3.5 w-3.5', !reduced && 'transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>
      <div
        id={contentId}
        className={cn('grid', !reduced && 'transition-[grid-template-rows] duration-200', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        <div ref={bodyRef} className="min-h-0 overflow-hidden">
          <CitationList citations={citations} idPrefix={prefix} favicons={favicons} className="mt-1" />
        </div>
      </div>
    </div>
  )
}
