import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useStyleOnce } from '../motion/_motion'

// Reveal FAQ: the heading and a help line on the left, a one-open accordion on the right. Answers
// fade in when they open; set reveal="letters" for the original letter-by-letter blur.
// Source: the layout and the letter reveal follow "text-reveal-faqs" by Ruixen on 21st.dev
// (https://21st.dev/@ruixen.ui/components/text-reveal-faqs). That listing states no license, so no
// code was taken from it: this is an independent implementation, first written for a template
// marketplace landing. Native <details name> gives the one-open accordion with no library, and a
// CSS animation with a per-letter delay replays on every open.
// The fade is the default because patterns/split-title-faq advises against a letter reveal on every
// open; the letter mode stays for a single, short FAQ where the effect is the point. Letters are grouped
// by word so Korean lines break between words. Both modes are switched off under reduced motion.

const CSS =
  '.dsg-faq summary::-webkit-details-marker{display:none}' +
  '.dsg-faq details[open] .dsg-faq-chev{transform:rotate(180deg)}' +
  '.dsg-faq details[open] .dsg-faq-ch{animation:dsg-faq-in 300ms var(--ease-out) both;animation-delay:calc(var(--i) * 15ms)}' +
  '.dsg-faq details[open] .dsg-faq-fade{animation:dsg-faq-fade var(--dur-dropdown) var(--ease-out) both}' +
  '@keyframes dsg-faq-in{from{opacity:0;filter:blur(calc(var(--blur-mask) * 5))}to{opacity:1;filter:blur(0)}}' +
  '@keyframes dsg-faq-fade{from{opacity:0}to{opacity:1}}' +
  '@media (prefers-reduced-motion: reduce){.dsg-faq details[open] .dsg-faq-ch,.dsg-faq details[open] .dsg-faq-fade{animation:none}}'

export interface FaqItem {
  q: string
  a: string
}

export interface RevealFaqProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title: string
  sub?: string
  /** A line with a contact link, shown under the heading on wide screens and under the list on narrow ones. */
  help?: React.ReactNode
  items: FaqItem[]
  /** How an answer appears when it opens. */
  reveal?: 'fade' | 'letters'
}

function Answer({ text, reveal }: { text: string; reveal: 'fade' | 'letters' }) {
  if (reveal === 'fade') return <p className="dsg-faq-fade m-0 pb-4 text-body text-text-muted [word-break:keep-all]">{text}</p>
  let n = 0
  const words = text.split(' ')
  return (
    <p className="m-0 pb-4 text-body text-text-muted" aria-label={text}>
      {words.map((word, w) => (
        <span key={w} className="inline-block whitespace-pre" aria-hidden>
          {[...word].map((ch) => (
            <span key={n} className="dsg-faq-ch inline-block" style={{ ['--i' as string]: n++ }}>
              {ch}
            </span>
          ))}
          {w < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </p>
  )
}

export function RevealFaq({ title, sub, help, items, reveal = 'fade', id, className, ...props }: RevealFaqProps) {
  useStyleOnce('dsg-faq-css', CSS)
  const reactId = React.useId()
  const group = `faq-${id ?? reactId.replace(/:/g, '')}`
  return (
    <section id={id} className={cn('dsg-faq', className)} {...props}>
      <div className="grid gap-8 md:grid-cols-[2fr_3fr] md:gap-12">
        <div className="grid content-start gap-3 md:sticky md:top-12 md:self-start md:gap-6">
          <h2 className="m-0 text-h1 font-semibold text-text [word-break:keep-all]">{title}</h2>
          {sub ? <p className="m-0 text-title text-text-muted [word-break:keep-all]">{sub}</p> : null}
          {help ? <p className="m-0 hidden text-sm text-text-muted md:block [word-break:keep-all]">{help}</p> : null}
        </div>
        <div>
          {items.map((item) => (
            <details key={item.q} name={group} className="border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm py-4 text-title font-medium text-text outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span>{item.q}</span>
                <svg className="dsg-faq-chev shrink-0 text-text-muted transition-transform duration-dropdown ease-out" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <Answer text={item.a} reveal={reveal} />
            </details>
          ))}
        </div>
        {help ? <p className="m-0 text-sm text-text-muted md:hidden [word-break:keep-all]">{help}</p> : null}
      </div>
    </section>
  )
}
