import * as React from 'react'
import { cn } from '../blocks/_cn'
import { safeHref } from '../blocks/_url'

// Logo wall: a sentence-case caption and one row of customer or partner marks at one optical height, in
// one ink, wrapping to two rows on phones. Marks come in as the supplied SVG or image files; until a file
// is supplied, the slot shows the organization's name as plain text with a "logo pending" note for the
// builder, never a made-up wordmark (AC-18, CMP-08).
// Follows patterns/monochrome-logo-strip: no marquee, no colored logos, links only where a case study
// exists, and certification lines only for audits that were passed.
// Original code, MIT.

export interface LogoWallItem {
  name: string
  /** The supplied mark. An SVG element drawn in currentColor, or an image file. */
  logo?: React.ReactNode | { src: string; width: number; height: number }
  /** Link to a case study. Leave out when there is none. */
  href?: string
}

export interface LogoWallProps extends React.HTMLAttributes<HTMLElement> {
  caption: string
  items: LogoWallItem[]
  /** For example "and 40 more teams". */
  more?: string
  /** Shown on text placeholders so the builder sees what is missing. Set to "" to hide. */
  pendingLabel?: string
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

function isFile(l: LogoWallItem['logo']): l is { src: string; width: number; height: number } {
  return !!l && typeof l === 'object' && 'src' in (l as object)
}

function Mark({ item, pendingLabel }: { item: LogoWallItem; pendingLabel: string }) {
  if (isFile(item.logo)) {
    // Scale every file to the same height; the width follows its own proportions.
    return <img src={item.logo.src} alt={item.name} height={24} width={Math.round((item.logo.width / item.logo.height) * 24)} className="h-6 w-auto opacity-80" />
  }
  if (item.logo) {
    return (
      <span role="img" aria-label={item.name} className="inline-flex h-6 items-center [&>svg]:h-full [&>svg]:w-auto">
        {item.logo}
      </span>
    )
  }
  return (
    <span className="inline-flex flex-col">
      <span className={cn('text-title font-semibold leading-6 text-text-muted', KEEP)}>{item.name}</span>
      {pendingLabel ? <span className="text-caption text-text-subtle">{pendingLabel}</span> : null}
    </span>
  )
}

export function LogoWall({ caption, items, more, pendingLabel = 'Logo file pending', className, ...props }: LogoWallProps) {
  const capId = React.useId()
  return (
    <section aria-labelledby={capId} className={cn('min-w-0', className)} {...props}>
      <p id={capId} className={cn('text-label text-text-subtle', KEEP)}>
        {caption}
      </p>
      <ul className="m-0 mt-5 flex list-none flex-wrap items-center gap-x-12 gap-y-6 p-0 text-text-muted">
        {items.map((it) => (
          <li key={it.name} className="min-w-0">
            {it.href ? (
              <a href={safeHref(it.href)} className="inline-flex min-h-11 items-center rounded-sm outline-none transition-opacity duration-press ease-out hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring">
                <Mark item={it} pendingLabel={pendingLabel} />
              </a>
            ) : (
              <Mark item={it} pendingLabel={pendingLabel} />
            )}
          </li>
        ))}
        {more ? <li className="text-body text-text-subtle">{more}</li> : null}
      </ul>
    </section>
  )
}
