import * as React from 'react'
import { cn } from '../blocks/_cn'
import { Prose } from './prose'

// Article: the layout of one long read. A header (section, title, standfirst, one muted line of author,
// date and reading time), an optional cover figure, the body set by Prose, and a table of contents built
// from the body's h2 and h3. On wide screens the contents sit in a sticky column beside the text and mark
// the section in view; on phones they fold into an "On this page" disclosure above the body.
// Follows patterns/long-form-prose and patterns/editorial-paper-sheet: one reading column, meta in one
// line, no cards per paragraph, no progress bar glued to the top of the viewport.
// Headings without an id get one from their text, so links to a section survive a reload.
// Original code, MIT.

export interface ArticleProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  section?: string
  title: string
  /** One or two sentences under the title. */
  standfirst?: string
  /** Author, date and reading time, already formatted, for example ["Ana Park", "12 Oct 2026", "7 min read"]. */
  meta?: string[]
  cover?: { src: string; alt: string; caption?: string; width: number; height: number }
  /** Body as rendered HTML, or pass children. */
  html?: string
  children?: React.ReactNode
  /** Show the table of contents. Default true when the body has two or more h2. */
  toc?: boolean
  tocLabel?: string
  as?: 'h1' | 'h2'
}

interface TocEntry {
  id: string
  text: string
  level: 2 | 3
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section'
  )
}

function useToc(body: React.RefObject<HTMLDivElement>, deps: unknown[]) {
  const [entries, setEntries] = React.useState<TocEntry[]>([])
  const [active, setActive] = React.useState<string | null>(null)

  React.useEffect(() => {
    const el = body.current
    if (!el) return
    const used = new Set<string>()
    const list: TocEntry[] = []
    el.querySelectorAll('h2, h3').forEach((h) => {
      const text = (h.textContent || '').trim()
      if (!text) return
      let id = h.id || slug(text)
      while (used.has(id) || (!h.id && document.getElementById(id))) id = `${id}-${used.size + 1}`
      used.add(id)
      if (!h.id) h.id = id
      ;(h as HTMLElement).style.scrollMarginTop = 'var(--sp-16)'
      list.push({ id, text, level: h.tagName === 'H2' ? 2 : 3 })
    })
    setEntries(list)
    if (typeof IntersectionObserver === 'undefined' || !list.length) return
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (obs) => {
        obs.forEach((o) => seen.set(o.target.id, o.isIntersecting))
        const first = list.find((e) => seen.get(e.id))
        if (first) setActive(first.id)
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    list.forEach((e) => {
      const h = document.getElementById(e.id)
      if (h) io.observe(h)
    })
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { entries, active }
}

function TocList({ entries, active }: { entries: TocEntry[]; active: string | null }) {
  return (
    <ol className="m-0 grid list-none gap-0 p-0">
      {entries.map((e) => (
        <li key={e.id} className={e.level === 3 ? 'pl-4' : undefined}>
          <a
            href={`#${e.id}`}
            aria-current={active === e.id ? 'location' : undefined}
            className={cn(
              'flex min-h-11 items-center rounded-sm py-1 text-label text-text-muted outline-none transition-colors duration-press ease-out hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:min-h-8',
              'aria-[current=location]:font-medium aria-[current=location]:text-text',
              KEEP,
            )}
          >
            {e.text}
          </a>
        </li>
      ))}
    </ol>
  )
}

export function Article({
  section,
  title,
  standfirst,
  meta,
  cover,
  html,
  children,
  toc,
  tocLabel = 'On this page',
  as: Heading = 'h1',
  className,
  ...props
}: ArticleProps) {
  const body = React.useRef<HTMLDivElement>(null)
  const { entries, active } = useToc(body, [html, children])
  const showToc = (toc ?? entries.filter((e) => e.level === 2).length >= 2) && entries.length > 0
  const tocId = React.useId()

  return (
    <article className={cn('min-w-0', className)} {...props}>
      <header className="max-w-[760px]">
        {section ? <p className={cn('mb-3 text-label font-medium text-text-muted', KEEP)}>{section}</p> : null}
        <Heading className={cn('text-h1 font-semibold leading-[var(--lh-tight)] tracking-[-0.01em] text-text text-balance', KEEP)}>{title}</Heading>
        {standfirst ? <p className={cn('mt-4 max-w-[60ch] text-title leading-[var(--lh-normal)] text-text-muted text-pretty', KEEP)}>{standfirst}</p> : null}
        {meta?.length ? (
          <p className="mt-5 flex flex-wrap gap-x-2 text-label tabular-nums text-text-subtle">
            {meta.map((m, i) => (
              <React.Fragment key={m}>
                {i > 0 ? <span aria-hidden>&middot;</span> : null}
                <span>{m}</span>
              </React.Fragment>
            ))}
          </p>
        ) : null}
      </header>

      {cover ? (
        <figure className="m-0 mt-10">
          <img src={cover.src} alt={cover.alt} width={cover.width} height={cover.height} className="block h-auto w-full rounded-xl bg-bg-sunken" />
          {cover.caption ? <figcaption className={cn('mt-3 text-label text-text-subtle', KEEP)}>{cover.caption}</figcaption> : null}
        </figure>
      ) : null}

      <div className={cn('mt-10', showToc && 'lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-16')}>
        {showToc ? (
          <details className="mb-8 border-y border-border lg:hidden [&:not([open])>:not(summary)]:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-sm text-body font-medium text-text outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              {tocLabel}
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-text-subtle">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className="pb-3">
              <TocList entries={entries} active={active} />
            </div>
          </details>
        ) : null}
        <Prose ref={body} html={html}>
          {html === undefined ? children : undefined}
        </Prose>
        {showToc ? (
          <nav aria-labelledby={tocId} className="hidden lg:block">
            <div className="sticky top-8">
              <p id={tocId} className="mb-2 text-label font-medium text-text">
                {tocLabel}
              </p>
              <TocList entries={entries} active={active} />
            </div>
          </nav>
        ) : null}
      </div>
    </article>
  )
}
