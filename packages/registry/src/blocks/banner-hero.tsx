import * as React from 'react'
import { cn } from './_cn'
import { useStyleOnce } from '../motion/_motion'

// Banner hero: a full-bleed photograph with the navigation, headline, actions and partner marks set on it. It belongs
// to patterns/photo-led-hero.md.
// Written for this registry after "Responsive Hero Banner" by sensewood8 on 21st.dev, picked by the owner. The license
// could not be confirmed, so no code was taken; it was written from the preview image. Changed on purpose: the glass
// navigation bar is plain (CMP-05), the pill above the headline is a plain line of text (CMP-01), there is no entrance
// animation (MOT-01), and a scrim built from the page's own surface token keeps the text readable on any photograph.

export interface BannerHeroProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** The photograph. Decorative images take an empty alt. */
  image: { src: string; alt: string }
  title: React.ReactNode
  description?: React.ReactNode
  /** Buttons or links under the headline. */
  actions?: React.ReactNode
  /** The navigation, set at the top. Use your own header here. */
  nav?: React.ReactNode
  /** One line of real news above the headline. Leave it out when there is none. */
  notice?: React.ReactNode
  /** Real partners or customers only, as original logo files. Leave it out when there are none. */
  logos?: React.ReactNode
  /** Words above the logos. */
  logosLabel?: React.ReactNode
  /** Tokens for the text. dark for a dark photograph, light for a bright one. Default dark. */
  tone?: 'dark' | 'light'
  /** Text position. Default center. */
  align?: 'center' | 'start'
  /** Fill the screen. Turn it off to set the height yourself. Default true. */
  fullHeight?: boolean
}

const CSS = `
.ds-bhero{position:relative;isolation:isolate;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--text)}
.ds-bhero[data-full]{min-height:100svh}
.ds-bhero-photo{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover}
.ds-bhero-scrim{position:absolute;inset:0;z-index:-1;background:linear-gradient(to bottom,color-mix(in oklch,var(--bg) 45%,transparent),color-mix(in oklch,var(--bg) 25%,transparent) 40%,color-mix(in oklch,var(--bg) 80%,transparent))}
.ds-bhero-nav{padding:var(--sp-4) var(--sp-6)}
.ds-bhero-body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:var(--sp-4);width:100%;max-width:56rem;margin-inline:auto;padding:var(--sp-16) var(--sp-6)}
.ds-bhero[data-align=center] .ds-bhero-body{align-items:center;text-align:center}
.ds-bhero[data-align=start] .ds-bhero-body{align-items:flex-start;max-width:none;margin-inline:0}
.ds-bhero-notice{margin:0;font-size:var(--t-sm);color:var(--text-muted)}
.ds-bhero-title{margin:0;font-size:clamp(var(--t-h1),6vw,calc(var(--t-display)*1.75));line-height:var(--lh-tight);font-weight:var(--w-semi);text-wrap:balance}
.ds-bhero-text{margin:0;max-width:40rem;font-size:var(--t-title);line-height:var(--lh-normal);color:var(--text-muted);text-wrap:pretty}
.ds-bhero-actions{display:flex;flex-wrap:wrap;gap:var(--sp-3);margin-top:var(--sp-2)}
.ds-bhero[data-align=center] .ds-bhero-actions{justify-content:center}
.ds-bhero-logos{padding:var(--sp-6);text-align:center}
.ds-bhero-logos-label{margin:0 0 var(--sp-4);font-size:var(--t-sm);color:var(--text-muted)}
.ds-bhero-logos-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:var(--sp-6) var(--sp-12)}
`

export function BannerHero({
  image, title, description, actions, nav, notice, logos, logosLabel, tone = 'dark', align = 'center', fullHeight = true, className, ...rest
}: BannerHeroProps) {
  useStyleOnce('ds-bhero', CSS)
  return (
    <section
      className={cn('ds-bhero', tone === 'dark' ? 'theme-dark' : 'theme-light', className)}
      data-align={align}
      data-full={fullHeight ? '' : undefined}
      {...rest}
    >
      <img className="ds-bhero-photo" src={image.src} alt={image.alt} />
      <div className="ds-bhero-scrim" aria-hidden="true" />
      {nav && <div className="ds-bhero-nav">{nav}</div>}
      <div className="ds-bhero-body">
        {notice && <p className="ds-bhero-notice">{notice}</p>}
        <h1 className="ds-bhero-title">{title}</h1>
        {description && <p className="ds-bhero-text">{description}</p>}
        {actions && <div className="ds-bhero-actions">{actions}</div>}
      </div>
      {logos && (
        <div className="ds-bhero-logos">
          {logosLabel && <p className="ds-bhero-logos-label">{logosLabel}</p>}
          <div className="ds-bhero-logos-row">{logos}</div>
        </div>
      )}
    </section>
  )
}
