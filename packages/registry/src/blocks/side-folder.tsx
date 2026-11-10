import * as React from 'react'
import { cn } from './_cn'

// Side folder: an illustration of a folder turned on its side, three sheets peeking out to the right
// from behind a frosted front pocket. On hover the pocket swings toward you and the sheets slide out.
// Meant as the picture on a feature card ("Files", "Documents", "Exports"), so it is a role="img"
// with a label, scales with its box and keeps a 3:2 frame.
// Written for this registry after a 21st.dev "Side Folder" the owner picked. Its source and license
// could not be traced, so only the idea was kept: the shapes, colors and motion here are new.

export interface SideFolderProps {
  /** Folder color, any CSS color or token. Default var(--chart-4), a mid gray. */
  color?: string
  /** How many sheets peek out, 1 to 3. Default 3. */
  sheets?: 1 | 2 | 3
  /** Accessible description of the picture. */
  label?: string
  className?: string
}

const CSS = `
.ds-sf{--sf-ease:var(--ease-out);position:relative;width:100%;aspect-ratio:3/2;overflow:hidden;container-type:inline-size}
.ds-sf-icon{position:absolute;left:50%;top:50%;width:40%;aspect-ratio:5/6;transform:translate(-50%,-50%);perspective:600px;transition:transform .6s var(--sf-ease)}
.ds-sf:hover .ds-sf-icon{transform:translate(-50%,-50%) scale(1.03)}
.ds-sf-back{position:absolute;inset:4% 0 2% 0;border-radius:9%/7.5%;background:var(--sf-color);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 6cqw 8cqw -4cqw rgba(0,0,0,.45)}
.ds-sf-sheet{position:absolute;left:12%;top:14%;width:72%;height:70%;border-radius:6%/5%;background:color-mix(in oklab,var(--foreground,#fafafa) 92%,var(--sf-color));border:1px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .55s var(--sf-ease)}
.ds-sf-sheet i{display:block;height:3.5%;margin:0 12% 5.5%;border-radius:99px;background:rgba(0,0,0,.14)}
.ds-sf-sheet i:first-child{margin-top:22%;width:40%;height:5%}
.ds-sf-sheet[data-n="0"]{transform:translate(30%,-3%) rotate(4deg)}
.ds-sf-sheet[data-n="1"]{transform:translate(24%,3%) rotate(-2deg)}
.ds-sf-sheet[data-n="2"]{transform:translate(18%,8%) rotate(2deg)}
.ds-sf:hover .ds-sf-sheet[data-n="0"]{transform:translate(44%,-6%) rotate(7deg)}
.ds-sf:hover .ds-sf-sheet[data-n="1"]{transform:translate(40%,2%) rotate(0deg)}
.ds-sf:hover .ds-sf-sheet[data-n="2"]{transform:translate(34%,10%) rotate(4deg)}
.ds-sf-front{position:absolute;inset:0;border-radius:9%/7.5%;clip-path:polygon(0 0,82% 0,82% 56%,100% 64%,100% 100%,0 100%);background:linear-gradient(170deg,color-mix(in oklab,var(--sf-color) 55%,transparent),color-mix(in oklab,var(--sf-color) 70%,black 10%));-webkit-backdrop-filter:blur(3cqw);backdrop-filter:blur(3cqw);box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);transform-origin:0 50%;transition:transform .6s var(--sf-ease)}
.ds-sf:hover .ds-sf-front{transform:rotateY(-12deg)}
@media (prefers-reduced-motion:reduce){.ds-sf-icon,.ds-sf-sheet,.ds-sf-front{transition:none}}
`

export function SideFolder({
  color = 'var(--chart-4)',
  sheets = 3,
  label = 'A folder on its side with documents peeking out',
  className,
}: SideFolderProps) {
  React.useInsertionEffect(() => {
    if (document.getElementById('ds-side-folder')) return
    const el = document.createElement('style')
    el.id = 'ds-side-folder'
    el.textContent = CSS
    document.head.appendChild(el)
  }, [])
  const count = Math.max(1, Math.min(3, sheets))
  return (
    <div className={cn('ds-sf', className)} role="img" aria-label={label} style={{ '--sf-color': color } as React.CSSProperties}>
      <div className="ds-sf-icon" aria-hidden="true">
        <div className="ds-sf-back" />
        {Array.from({ length: count }, (_, n) => (
          <div key={n} className="ds-sf-sheet" data-n={3 - count + n}>
            <i />
            <i />
            <i style={{ width: '60%' }} />
            <i />
            <i style={{ width: '45%' }} />
          </div>
        ))}
        <div className="ds-sf-front" />
      </div>
    </div>
  )
}
