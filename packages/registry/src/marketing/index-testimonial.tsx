import * as React from 'react'
import { cn } from '../blocks/_cn'
import { Marquee } from '../motion/marquee'
import { useReducedMotion, useStyleOnce } from '../motion/_motion'

// Index testimonial: one quote at a time in a page section. The item's place in the sequence (n of N) is set as a huge,
// faint numeral behind the quote, cut off at the left edge; a hairline rail carries the section's word set vertically and
// a tick that shows how far along the reader is; round previous and next buttons sit on the right; a slow band of the
// companies' names runs along the bottom. See patterns/outcome-quote-card and patterns/marquee-band.
// Written for this registry after "Design Testimonial" by jatin-yadav05 on 21st.dev, picked by the owner. The license
// could not be confirmed, so no code was taken; it was written from the preview. Changed on purpose: no motion library,
// a change is a CSS fade with a short slide in the direction of travel and stops under reduced motion; the numeral is
// the real position, aria-hidden, and the slide carries "2 of 4" for screen readers instead; the company above the
// quote is plain text, not a tinted pill; the vertical word is sentence case with normal tracking; the mark before the
// name is a drawn hairline, not a dash character; the name band reuses motion/marquee, is hidden from screen readers
// (the names are already in the quotes), keeps its pause button and holds one still row under reduced motion; the
// section keeps the height of its longest quote, so the buttons do not jump; sizes follow the section's width, not the
// window. Use only words a real person said and agreed to publish (CMP-08).

export interface IndexTestimonialItem {
  quote: string
  name: string
  role: string
  /** Organization name, written out. Shown above the quote and in the name band. */
  company: string
  /** Language of this item when it differs from the page, for example "ko". */
  lang?: string
}

export interface IndexTestimonialProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  items?: IndexTestimonialItem[]
  /** The item shown first. */
  initialIndex?: number
  /** The word set vertically on the rail. It is also the carousel's accessible name. */
  label?: string
  /** The slow band of company names along the bottom. */
  showMarquee?: boolean
  /** Called with the new index after the buttons or an arrow key move to another item. */
  onIndexChange?: (index: number) => void
  /** Set the last word of each quote in the muted text color, as the reference does. */
  muteLastWord?: boolean
  labels?: { previous?: string; next?: string; of?: string; pause?: string; play?: string }
}

const DEFAULT_ITEMS: IndexTestimonialItem[] = [
  {
    quote: 'The report named the three forms that broke on phones, and we fixed all of them the same afternoon.',
    name: 'Name Surname',
    role: 'Head of support',
    company: 'Online store',
  },
  {
    quote: 'Clients now read the same findings we do, so a release review takes half a day instead of two.',
    name: 'Name Surname',
    role: 'Design lead',
    company: 'Product studio',
  },
  {
    quote: 'Our catalog pages finally hold together at every width, including the old kiosk in the lobby.',
    name: 'Name Surname',
    role: 'Web editor',
    company: 'City library',
  },
  {
    quote: '긴 제목이 단어 중간에서 끊기던 곳을 한 주 만에 모두 찾아 고쳤습니다.',
    name: '홍길동',
    role: '문서 운영 담당',
    company: '사내 문서팀',
    lang: 'ko',
  },
]

const CSS =
  // The section is the size container, so the numeral, the quote and the band scale with it, not with the window.
  '.dsg-idx{container-type:inline-size}' +
  '.dsg-idx-num{position:absolute;z-index:-1;top:0;left:-.08em;font-size:calc(var(--t-display) * 6);font-size:clamp(calc(var(--t-display) * 3),30cqi,calc(var(--t-display) * 10));line-height:.78;font-weight:var(--w-semi);font-variant-numeric:tabular-nums;letter-spacing:-.02em;white-space:nowrap;color:var(--text);opacity:.06;pointer-events:none;user-select:none}' +
  '.dsg-idx-label{writing-mode:vertical-rl;text-orientation:sideways;transform:rotate(180deg);white-space:nowrap}' +
  '.dsg-idx-quote{font-size:var(--t-h2);font-size:clamp(var(--t-h2),3.6cqi,calc(var(--t-display) * 1.33));line-height:var(--lh-snug);font-weight:var(--w-reg);letter-spacing:-.01em;max-width:22em;text-wrap:pretty}' +
  '.dsg-idx-quote:lang(ko){line-height:calc(var(--lh-normal) + .1);letter-spacing:0}' +
  // One line tall and clipped. Under reduced motion the marquee renders a static row; it is kept on one line here and
  // fades out at the right edge, so the band reads as the same strip held still.
  '.dsg-idx-band{font-size:calc(var(--t-display) * 1.5);font-size:clamp(calc(var(--t-display) * 1.25),8cqi,calc(var(--t-display) * 3));line-height:1.2;height:1.2em;overflow:hidden}' +
  '.dsg-idx-band>div{flex-wrap:nowrap}' +
  '@media (prefers-reduced-motion: reduce){.dsg-idx-band{-webkit-mask-image:linear-gradient(to right,currentColor calc(100% - var(--sp-16)),transparent);mask-image:linear-gradient(to right,currentColor calc(100% - var(--sp-16)),transparent)}}' +
  '.dsg-idx-name{gap:.4em;color:var(--text);opacity:.1;font-weight:var(--w-semi);white-space:nowrap}' +
  // The separator is a bullet character, not a drawn dot: sixteen empty boxes read as a drawn mockup to AC-17.
  '.dsg-idx-dot{font-weight:var(--w-reg)}' +
  '.dsg-idx-tick{transition:transform var(--dur-modal) var(--ease-in-out)}' +
  '.dsg-idx-in{animation:dsg-idx-in var(--dur-modal) var(--ease-out) both}' +
  '.dsg-idx-num-in{animation:dsg-idx-num var(--dur-modal) var(--ease-out) both}' +
  '@keyframes dsg-idx-in{from{opacity:0;transform:translate3d(calc(var(--enter-offset) * 2 * var(--idx-dir,1)),0,0)}to{opacity:1;transform:none}}' +
  '@keyframes dsg-idx-num{from{opacity:0;transform:translate3d(0,calc(var(--enter-offset) * 4 * var(--idx-dir,1)),0)}to{opacity:1;transform:none}}' +
  '@media (prefers-reduced-motion: reduce){.dsg-idx-in,.dsg-idx-num-in{animation:none}.dsg-idx-tick{transition:none}}'

const KEEP = 'break-keep [overflow-wrap:break-word]'
const BTN =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border border-border text-text outline-none transition-colors duration-press ease-out ' +
  'hover:border-text-subtle focus-visible:ring-2 focus-visible:ring-ring'

function wrap(k: number, n: number): number {
  if (!n || !Number.isFinite(k)) return 0
  return ((Math.trunc(k) % n) + n) % n
}

// "...the same afternoon." becomes ["...the same ", "afternoon."], so the last word can take the muted color.
function splitLast(quote: string): [string, string] {
  const t = quote.trim()
  const k = t.lastIndexOf(' ')
  return k < 0 ? [t, ''] : [t.slice(0, k + 1), t.slice(k + 1)]
}

function Arrow({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={back ? 'M19 12H5m6-6-6 6 6 6' : 'M5 12h14m-6-6 6 6-6 6'} />
    </svg>
  )
}

type SlideProps = { item: IndexTestimonialItem; mute: boolean } & React.HTMLAttributes<HTMLElement>

function Slide({ item, mute, className, ...props }: SlideProps) {
  const [head, tail] = mute ? splitLast(item.quote) : [item.quote, '']
  return (
    <figure lang={item.lang} className={cn('m-0 min-w-0', className)} {...props}>
      <p className={cn('m-0 text-label font-medium text-text-muted', KEEP)}>{item.company}</p>
      <blockquote className="m-0 mt-4">
        <p className={cn('dsg-idx-quote m-0 text-text', KEEP)}>
          {head}
          {tail ? <span className="text-text-muted">{tail}</span> : null}
        </p>
      </blockquote>
      <figcaption className="mt-8 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 text-body">
        <span aria-hidden className="h-px w-6 bg-text-subtle" />
        <span className={cn('font-medium text-text', KEEP)}>{item.name}</span>
        <span className={cn('col-start-2 text-text-muted', KEEP)}>{item.role}</span>
      </figcaption>
    </figure>
  )
}

export function IndexTestimonial({
  items = DEFAULT_ITEMS,
  initialIndex = 0,
  label = 'Testimonials',
  showMarquee = true,
  onIndexChange,
  muteLastWord = true,
  labels = {},
  className,
  style,
  onKeyDown,
  ...props
}: IndexTestimonialProps) {
  useStyleOnce('dsg-idx-css', CSS)
  const L = { previous: 'Previous', next: 'Next', of: 'of', pause: 'Pause', play: 'Play', ...labels }
  const reduced = useReducedMotion()
  const labelId = React.useId()
  const slidesId = React.useId()
  const n = items.length
  const [state, setState] = React.useState(() => ({ index: wrap(initialIndex, n), dir: 1, moved: false }))
  if (n === 0) return null

  const i = Math.min(state.index, n - 1)
  const item = items[i]
  // Only a move by the visitor animates; the first paint and reduced motion show the item at rest.
  const animate = state.moved && !reduced
  const numeral = String(i + 1).padStart(Math.max(2, String(n).length), '0')

  function go(to: number, dir: 1 | -1) {
    const next = wrap(to, n)
    if (next === i) return
    setState({ index: next, dir, moved: true })
    onIndexChange?.(next)
  }

  function handleKey(e: React.KeyboardEvent<HTMLElement>) {
    onKeyDown?.(e)
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || n < 2) return
    const moves: Record<string, [number, 1 | -1]> = { ArrowRight: [i + 1, 1], ArrowLeft: [i - 1, -1], Home: [0, -1], End: [n - 1, 1] }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    go(m[0], m[1])
  }

  // Company names for the band, once each, repeated so one copy of the loop is wider than the section.
  const seen = new Set<string>()
  const names = items.filter((it) => it.company && !seen.has(it.company) && seen.add(it.company))
  const band: IndexTestimonialItem[] = []
  while (names.length && band.length < 8) band.push(...names)

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      {...props}
      className={cn('dsg-idx relative isolate overflow-hidden py-12 md:py-16', className)}
      style={{ ...style, ['--idx-dir' as string]: state.dir }}
      onKeyDown={handleKey}
    >
      <span aria-hidden className="dsg-idx-num">
        <span key={i} className={cn('block', animate && 'dsg-idx-num-in')}>
          {numeral}
        </span>
      </span>

      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 sm:gap-x-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-12">
        <div className="row-span-2 flex flex-col items-center gap-4 md:row-span-1">
          <span id={labelId} className={cn('dsg-idx-label text-label font-medium text-text-muted', KEEP)}>
            {label}
          </span>
          <span aria-hidden className="relative min-h-12 w-px flex-1 overflow-hidden bg-border">
            <span
              className="dsg-idx-tick absolute inset-x-0 top-0 bg-text"
              style={{ height: `${100 / n}%`, transform: `translateY(${i * 100}%)` }}
            />
          </span>
        </div>

        <div className="grid min-w-0 pt-16 md:pt-24">
          {/* Every quote, invisible, in the same cell: the cell takes the tallest one's height. */}
          {items.map((it, k) => (
            <Slide key={k} item={it} mute={muteLastWord} aria-hidden className="invisible col-start-1 row-start-1" />
          ))}
          <div id={slidesId} aria-live="polite" aria-atomic="true" className="col-start-1 row-start-1 min-w-0">
            <Slide
              key={i}
              item={item}
              mute={muteLastWord}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} ${L.of} ${n}`}
              className={animate ? 'dsg-idx-in' : undefined}
            />
          </div>
        </div>

        {n > 1 ? (
          <div className="col-start-2 mt-8 flex items-center justify-end gap-2 pr-1 md:col-start-3 md:row-start-1 md:mt-0 md:self-end">
            <button type="button" className={BTN} onClick={() => go(i - 1, -1)} aria-label={L.previous} aria-controls={slidesId}>
              <Arrow back />
            </button>
            <button type="button" className={BTN} onClick={() => go(i + 1, 1)} aria-label={L.next} aria-controls={slidesId}>
              <Arrow />
            </button>
          </div>
        ) : null}
      </div>

      {showMarquee && band.length ? (
        <div className="dsg-idx-band mt-12 pr-1 md:mt-16">
          <Marquee durationSec={band.length * 6} gap="0.4em" pauseLabel={L.pause} playLabel={L.play}>
            {band.map((b, k) => (
              <span key={k} aria-hidden lang={b.lang} className="dsg-idx-name inline-flex items-center">
                {b.company}
                <span className="dsg-idx-dot">{'•'}</span>
              </span>
            ))}
          </Marquee>
        </div>
      ) : null}
    </section>
  )
}
