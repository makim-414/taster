import * as React from 'react'
import { cn } from './_cn'

// Orbit illustration: a center tile inside two rings, a light trace running around each ring in
// opposite directions and small nodes orbiting the outer ring, staying upright. The picture on a
// feature card about syncing, enriching or connecting data. role="img", 3:2 frame, scales with its box.
// Written for this registry after a 21st.dev "Enrichment Orbit" the owner picked. Its source and
// license could not be traced, so it was drawn new: token colors instead of the peach to lilac comet
// gradient, and plain glyphs in the nodes.

export interface OrbitIllustrationProps {
  /** Glyph in the center tile. Default a small grid. Pass any SVG content drawn on a 24 grid. */
  center?: React.ReactNode
  /** Number of orbiting nodes, 0 to 4. Default 3. */
  nodes?: number
  /** Seconds for one node orbit. Default 22. */
  period?: number
  label?: string
  className?: string
}

const CSS = `
.ds-orb{position:relative;width:100%;aspect-ratio:3/2;overflow:hidden}
.ds-orb svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.ds-orb-spin{transform-origin:160px 120px;animation:ds-orb-turn 7s linear infinite}
.ds-orb-rev{animation-direction:reverse}
.ds-orb-orbit{transform-origin:160px 120px;animation:ds-orb-turn var(--orb-period,22s) linear infinite}
.ds-orb-up{transform-box:fill-box;transform-origin:center;animation:ds-orb-turn var(--orb-period,22s) linear infinite reverse}
@keyframes ds-orb-turn{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.ds-orb-spin,.ds-orb-orbit,.ds-orb-up{animation-play-state:paused}}
`

const GLYPHS = [
  '<rect x="5" y="5" width="6" height="6" rx="1.5"/><rect x="13" y="5" width="6" height="6" rx="1.5"/><rect x="5" y="13" width="6" height="6" rx="1.5"/><rect x="13" y="13" width="6" height="6" rx="1.5"/>',
  '<circle cx="12" cy="9" r="3.5"/><path d="M5 19c1.2-3 3.8-4.5 7-4.5s5.8 1.5 7 4.5"/>',
  '<path d="M4 20h16"/><path d="M7 20v-6M12 20V8M17 20v-9"/>',
  '<path d="M12 3v18M3 12h18"/>',
]

export function OrbitIllustration({ center, nodes = 3, period = 22, label = 'A center tile with data nodes orbiting around it', className }: OrbitIllustrationProps) {
  React.useInsertionEffect(() => {
    if (document.getElementById('ds-orbit-illustration')) return
    const el = document.createElement('style')
    el.id = 'ds-orbit-illustration'
    el.textContent = CSS
    document.head.appendChild(el)
  }, [])
  const gid = 'orb' + React.useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const count = Math.max(0, Math.min(4, nodes))
  return (
    <div className={cn('ds-orb', className)} role="img" aria-label={label} style={{ '--orb-period': `${period}s` } as React.CSSProperties}>
      <svg viewBox="0 0 320 240" aria-hidden="true">
        <defs>
          <linearGradient id={`${gid}-trace`}>
            <stop offset="0" stopColor="var(--text)" stopOpacity="0" />
            <stop offset=".5" stopColor="var(--text)" stopOpacity=".75" />
            <stop offset="1" stopColor="var(--text)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="var(--border-input, var(--border))" strokeWidth="1.2">
          <circle cx="160" cy="120" r="56" strokeOpacity=".6" />
          <circle cx="160" cy="120" r="80" />
        </g>
        <g className="ds-orb-spin">
          <path fill="none" stroke={`url(#${gid}-trace)`} strokeWidth="1.6" strokeLinecap="round" d="M114.1 54.5 A80 80 0 0 1 205.9 54.5" />
        </g>
        <g className="ds-orb-spin ds-orb-rev">
          <path fill="none" stroke={`url(#${gid}-trace)`} strokeWidth="1.6" strokeLinecap="round" d="M120.4 80.4 A56 56 0 0 1 199.6 80.4" />
        </g>
        <rect x="134" y="94" width="52" height="52" rx="12" fill="var(--popover)" stroke="var(--border)" />
        <g transform="translate(148 108)" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {center ?? <g dangerouslySetInnerHTML={{ __html: GLYPHS[0] }} />}
        </g>
        {Array.from({ length: count }, (_, i) => {
          const delay = `${(-period * i) / Math.max(1, count)}s`
          return (
            <g key={i} className="ds-orb-orbit" style={{ animationDelay: delay }}>
              <g className="ds-orb-up" style={{ animationDelay: delay }}>
                <circle cx="160" cy="40" r="17" fill="var(--popover)" stroke="var(--border)" />
                <g
                  transform="translate(152 32) scale(0.667)"
                  fill="none"
                  stroke="var(--text-muted)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: GLYPHS[(i + 1) % GLYPHS.length] }}
                />
              </g>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
