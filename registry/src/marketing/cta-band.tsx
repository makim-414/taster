import * as React from 'react'
import { cn } from '../blocks/_cn'

// CTA band: one sentence that names the next step, one solid action, at most one quieter alternative and
// an optional line of true conditions. Sentence left and actions right on wide screens, stacked on phones.
// Follows patterns/neutral-cta-band: a flat surface with a hairline and the card radius, no glow, no
// gradient, no shadow halo on the button, no third button and no row of proof inside the band.
// Original code, MIT.

export interface CtaBandProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** 6 to 14 words that say what the visitor gets or what happens next. */
  title: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
  /** Conditions, only when true, for example "Free up to 200 pages. No card needed." */
  note?: string
  as?: 'h2' | 'h3'
  /** "surface" draws the band on the sunken surface with a hairline; "plain" keeps only the hairlines above and below. */
  tone?: 'surface' | 'plain'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const BTN =
  'inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md px-6 text-title font-medium outline-none ' +
  'transition-[opacity,colors,transform] duration-press ease-out active:scale-press focus-visible:ring-2 focus-visible:ring-ring'

export function CtaBand({ title, primary, secondary, note, as: Heading = 'h2', tone = 'surface', className, ...props }: CtaBandProps) {
  const titleId = React.useId()
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12',
        tone === 'surface' ? 'rounded-xl border border-border bg-bg-sunken p-6 sm:p-8 lg:px-12 lg:py-10' : 'border-y border-border py-10',
        className,
      )}
      {...props}
    >
      <div className="max-w-[640px]">
        <Heading id={titleId} className={cn('text-h2 font-semibold leading-[var(--lh-snug)] text-text text-balance', KEEP)}>
          {title}
        </Heading>
        {note ? <p className={cn('mt-2 text-label text-text-subtle', KEEP)}>{note}</p> : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
        <a href={primary.href} className={cn(BTN, 'bg-accent text-accent-fg hover:opacity-90')}>
          {primary.label}
        </a>
        {secondary ? (
          <a href={secondary.href} className={cn(BTN, 'border border-border text-text hover:border-text-subtle')}>
            {secondary.label}
          </a>
        ) : null}
      </div>
    </section>
  )
}
