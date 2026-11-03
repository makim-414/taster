import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Photo hero: one photograph fills the band, a plain dark scrim rises from the bottom so the text reads,
// and the headline and one action sit at the bottom left. Nothing is centered.
// Follows patterns/photo-led-hero: no colored scrim, no carousel, no pill, no second solid button.
// The text uses --on-scrim, which stays light in every theme because the scrim stays dark.
// The image is a real <img> with alt text, so it loads, crops (object-fit) and prints like content.
// Original code, MIT.

export interface PhotoHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  image: { src: string; alt: string; position?: string }
  title: string
  lead?: string
  action?: { label: string; href: string }
  /** Photographer or source, shown small in the bottom right. */
  credit?: string
  as?: 'h1' | 'h2'
  /** Band height. Default "tall" (min 560px, 80vh on wide screens). */
  size?: 'tall' | 'medium'
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const ACTION =
  'inline-flex h-11 items-center justify-center rounded-md bg-on-scrim px-6 text-title font-medium text-on-scrim-ink outline-none ' +
  'transition-[opacity,transform] duration-press ease-out hover:opacity-90 active:scale-press focus-visible:ring-2 focus-visible:ring-on-scrim focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--scrim)]'

export function PhotoHero({ image, title, lead, action, credit, as: Heading = 'h1', size = 'tall', className, ...props }: PhotoHeroProps) {
  const titleId = React.useId()
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'relative isolate flex overflow-hidden rounded-xl bg-bg-sunken',
        size === 'tall' ? 'min-h-[560px] lg:min-h-[80vh]' : 'min-h-[420px]',
        className,
      )}
      {...props}
    >
      <img
        src={image.src}
        alt={image.alt}
        className="absolute inset-0 -z-20 h-full w-full object-cover"
        style={{ objectPosition: image.position ?? 'center' }}
      />
      <div aria-hidden className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--scrim))' }} />
      <div className="mt-auto flex w-full flex-wrap items-end justify-between gap-6 p-6 sm:p-8 lg:p-12">
        <div className="max-w-[640px]">
          <Heading id={titleId} className={cn('text-h1 font-semibold leading-[var(--lh-tight)] tracking-[-0.01em] text-on-scrim text-balance lg:text-display', KEEP)}>
            {title}
          </Heading>
          {lead ? <p className={cn('mt-3 max-w-[52ch] text-title font-reg leading-[var(--lh-normal)] text-on-scrim-muted', KEEP)}>{lead}</p> : null}
          {action ? (
            <a href={safeHref(action.href)} className={cn(ACTION, 'mt-6')}>
              {action.label}
            </a>
          ) : null}
        </div>
        {credit ? <p className="text-caption text-on-scrim-muted">{credit}</p> : null}
      </div>
    </section>
  )
}
