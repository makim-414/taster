import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useInViewOnce, useReducedMotion, useStyleOnce } from './_motion'

// Lamp glow: a section that opens with one lamp at the top, a thin bright tube with light falling from it in a widening
// cone and a brighter pool right under it, and sets its children (a heading, a line, a button) in the light below.
// CSS only, no canvas: a conic cone whose edges start at the tube's ends, a small pool and a crisp line. The light
// reads --brand and the surface reads --bg, so a theme switch changes both with no edit. See
// patterns/ambient-background.md.
// Written for this registry after "Lamp" by manuarora700 (Aceternity) on 21st.dev, picked by the owner. The license
// could not be confirmed, so no code was taken; it was written from the preview. Changed on purpose: the fixed navy
// section is gone (the surface is --bg, or the parent's with surface="transparent") and the heading is plain token text
// instead of gradient-filled text (COL-04); the blurred glow around the tube is gone, so the tube is a crisp line with no
// shadow (COL-07); the light is one directional source in a dim room, not loose blurred pools (BG-01). The light is
// screen-blended and the room around it is dimmed a little with --scrim, so on a light surface the cone reads as light
// falling on the paper and never as a dark stain. It opens once on first view with CSS keyframes; reduced motion draws
// it open and still.

export interface LampGlowProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
  /** Color of the light, any CSS color or token. Default var(--brand). */
  color?: string
  /** Width of the tube in px. It never takes more than 70% of the section. Default 448. */
  width?: number
  /** Strength of the light and of the dim around it, 0 to 1.5. Default 1. */
  intensity?: number
  /** How far the light falls below the tube, in px. Default 320. */
  height?: number
  /** Open the lamp the first time it scrolls into view. Off, or under reduced motion, it is drawn open. Default true. */
  animate?: boolean
  /** The section's surface. Default var(--bg). Pass transparent to light the parent's surface instead. */
  surface?: string
  /** What stands in the light: a heading, a line, a button. */
  children?: React.ReactNode
}

// The fan is one conic gradient from a point above the tube, placed so the edges of the cone pass through the tube's
// ends (35deg each side of straight down), so the light widens from the ends like a V. It softens just inside that
// edge, so nothing spills past the tube at its own height. The part above the tube is clipped away and a mask fades
// the light out downward. One element, so no seam shows at any width. The padding and margin carry the apex height
// because their percentages, like --lamp-w, read the width.
const CSS = [
  '.dsg-lamp{--lamp-top:var(--sp-16);--lamp-dim:color-mix(in oklch,var(--scrim) calc(var(--lamp-k) * 24%),transparent)}',
  '.dsg-lamp-stage{position:relative;width:100%;height:calc(var(--lamp-top) + var(--lamp-h));pointer-events:none}',
  '.dsg-lamp-dim{position:absolute;inset:0;background:linear-gradient(to bottom,var(--lamp-dim),var(--lamp-dim) var(--lamp-top),transparent calc(var(--lamp-top) + var(--lamp-h)))}',
  '.dsg-lamp-fan{position:absolute;top:var(--lamp-top);left:0;right:0;box-sizing:content-box;height:var(--lamp-h);margin-top:calc(var(--lamp-w) * -.714);padding-top:calc(var(--lamp-w) * .714);transform-origin:50% 0}',
  '.dsg-lamp-fan{background:conic-gradient(at 50% 0,transparent 145deg,var(--lamp-c1) 156deg,var(--lamp-c0) 180deg,var(--lamp-c1) 204deg,transparent 215deg);background-clip:content-box}',
  '.dsg-lamp-fan{-webkit-mask-image:linear-gradient(to bottom,#000,40%,transparent);-webkit-mask-origin:content-box;-webkit-mask-clip:content-box}',
  '.dsg-lamp-fan{mask-image:linear-gradient(to bottom,#000,40%,transparent);mask-origin:content-box;mask-clip:content-box}',
  // The lit fan paints the surface back over the dim, so on paper the cone is the paper and the room around it is dimmer.
  '.dsg-lamp-lit{--lamp-c0:var(--lamp-surface);--lamp-c1:color-mix(in oklch,var(--lamp-surface) 85%,transparent)}',
  // The light itself is screen-blended: it can only brighten, so an ink brand on paper adds nothing instead of a stain.
  '.dsg-lamp-light{mix-blend-mode:screen;--lamp-c0:color-mix(in oklch,var(--lamp) calc(var(--lamp-k) * 40%),transparent);--lamp-c1:color-mix(in oklch,var(--lamp) calc(var(--lamp-k) * 20%),transparent)}',
  '.dsg-lamp-pool{position:absolute;top:var(--lamp-top);left:50%;width:calc(var(--lamp-w) * 1.2);height:calc(var(--lamp-h) * .5);margin-left:calc(var(--lamp-w) * -.6);mix-blend-mode:screen;transform-origin:50% 0;background:radial-gradient(50% 100% at 50% 0,color-mix(in oklch,var(--lamp) calc(var(--lamp-k) * 44%),transparent),30%,transparent)}',
  '.dsg-lamp-tube{position:absolute;top:calc(var(--lamp-top) - var(--sp-1) / 4);left:50%;width:var(--lamp-w);height:calc(var(--sp-1) / 2);margin-left:calc(var(--lamp-w) / -2);background:var(--lamp)}',
  '.dsg-lamp[data-state="closed"] .dsg-lamp-part{transform:scaleX(.5);opacity:.3}',
  '.dsg-lamp[data-state="open"] .dsg-lamp-part{animation:dsg-lamp-open calc(var(--dur-modal) * 2) var(--ease-out) calc(var(--dur-modal) / 4) both}',
  '@keyframes dsg-lamp-open{from{transform:scaleX(.5);opacity:.3}to{transform:none;opacity:1}}',
  '@media (prefers-reduced-motion: reduce){.dsg-lamp .dsg-lamp-part{animation:none;transform:none;opacity:1}}',
].join('\n')

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))

export function LampGlow({
  color = 'var(--brand)', width = 448, intensity = 1, height = 320, animate = true, surface = 'var(--bg)',
  className, style, children, ...props
}: LampGlowProps) {
  useStyleOnce('dsg-lamp-css', CSS)
  const ref = React.useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  // Opens when its top passes the lower fifth of the screen; threshold 0 so a section taller than the screen still opens.
  const seen = useInViewOnce(ref, '0px 0px -20% 0px', 0)
  // Drawn open until script runs, so a page without script or a crawler still gets the whole lamp. Armed before the
  // first paint, so the open frame never flashes before the opening plays.
  const [armed, setArmed] = React.useState(false)
  const moving = animate && !reduced
  React.useLayoutEffect(() => { if (moving) setArmed(true) }, [moving])
  const state = !moving || !armed ? 'still' : seen ? 'open' : 'closed'

  const vars = {
    '--lamp': color,
    '--lamp-surface': surface === 'transparent' ? 'var(--bg)' : surface,
    '--lamp-w': `min(${clamp(width, 24, 4000)}px, 70%)`,
    '--lamp-h': `${clamp(height, 80, 4000)}px`,
    '--lamp-k': String(clamp(intensity, 0, 1.5)),
    background: surface,
  } as React.CSSProperties

  return (
    <section
      ref={ref}
      data-state={state}
      className={cn('dsg-lamp relative flex flex-col items-center overflow-hidden', className)}
      style={{ ...vars, ...style }}
      {...props}
    >
      <div aria-hidden="true" className="dsg-lamp-stage">
        <div className="dsg-lamp-dim" />
        <div className="dsg-lamp-fan dsg-lamp-lit dsg-lamp-part" />
        <div className="dsg-lamp-fan dsg-lamp-light dsg-lamp-part" />
        <div className="dsg-lamp-pool dsg-lamp-part" />
        <div className="dsg-lamp-tube dsg-lamp-part" />
      </div>
      <div className="relative flex w-full flex-col items-center px-4 pb-16 text-center" style={{ marginTop: 'calc(var(--lamp-h) * -.5)' }}>
        {children}
      </div>
    </section>
  )
}
