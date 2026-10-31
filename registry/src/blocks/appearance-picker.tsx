import * as React from 'react'
import { cn } from './_cn'
import { useStyleOnce } from '../motion/_motion'

// Appearance picker: three radio cards (light, dark, system), each showing a small screen drawn with the real tokens,
// so the previews follow the brand. For services where the mode matters enough to sit on a settings page. This is the
// component for patterns/appearance-picker.md.
// Written for this registry after a 21st.dev "Theme Toggle" the owner picked, which comes from Campsite's ThemePicker.
// Campsite is CC BY-NC 4.0, which does not fit an MIT registry or commercial use, so no code or SVG was taken. Left out
// on purpose: next-themes and framer-motion as requirements, the blue ring, the fixed hex previews, and returning null
// until mount, which made the section jump in.
// Needs tokens.css and themes/light.css.

export type Appearance = 'light' | 'dark' | 'system'

const DEFAULT_KEY = 'theme'
const DEFAULT_LABELS: Record<Appearance, string> = { light: 'Light', dark: 'Dark', system: 'System' }
const OPTIONS: Appearance[] = ['light', 'dark', 'system']

export interface AppearancePickerProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange' | 'defaultValue'> {
  /** Controlled value. With it, the caller applies the mode (for example with next-themes). */
  value?: Appearance
  /** First value when uncontrolled and nothing is stored. Default system. */
  defaultValue?: Appearance
  onValueChange?: (value: Appearance) => void
  /** localStorage key when uncontrolled. Default theme. */
  storageKey?: string
  /** Group name, read by screen readers and shown above the cards. Default Theme. */
  legend?: React.ReactNode
  /** Labels per option, for other languages. */
  labels?: Partial<Record<Appearance, string>>
}

const CSS = `
.ds-appr{border:0;margin:0;padding:0;min-width:0}
.ds-appr-legend{padding:0;margin-bottom:var(--sp-3);font-size:var(--t-body);font-weight:var(--w-med);color:var(--text)}
.ds-appr-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--sp-3)}
.ds-appr-opt{position:relative;display:block;cursor:pointer}
.ds-appr-opt input{position:absolute;inset:0;z-index:1;width:100%;height:100%;margin:0;opacity:0;cursor:pointer}
.ds-appr-frame{position:relative;display:block;aspect-ratio:4/3;overflow:hidden;border-radius:var(--r-md);outline:1px solid var(--border);outline-offset:0;transition:outline-color var(--dur-dropdown) var(--ease-out)}
.ds-appr-opt:hover .ds-appr-frame{outline-color:var(--text-subtle)}
.ds-appr-opt input:checked~.ds-appr-frame{outline:2px solid var(--brand);outline-offset:2px}
.ds-appr-opt input:focus-visible~.ds-appr-frame{outline:2px solid var(--ring);outline-offset:4px}
.ds-appr-name{display:block;margin-top:var(--sp-3);font-size:var(--t-sm);color:var(--text-muted);text-align:center}
.ds-appr-opt input:checked~.ds-appr-name{font-weight:var(--w-semi);color:var(--text)}
.ds-appr-mock{position:absolute;inset:0;display:grid;grid-template-columns:28% 1fr;background:var(--bg)}
.ds-appr-mock.theme-dark{color-scheme:dark}
.ds-appr-mock[data-half]{clip-path:polygon(100% 0,100% 100%,0 100%)}
.ds-appr-side{display:flex;flex-direction:column;gap:8%;padding:12% 10%;background:var(--bg-sunken)}
.ds-appr-main{display:flex;flex-direction:column;gap:6%;padding:9% 10%}
.ds-appr-bar{display:block;height:5%;min-height:2px;border-radius:var(--r-sm);background:var(--text-subtle)}
.ds-appr-side .ds-appr-bar{height:8%;background:var(--border)}
.ds-appr-head{width:45%;background:var(--text)}
.ds-appr-panel{display:block;flex:1;border-radius:var(--r-sm);background:var(--bg-sunken)}
`

function Screen({ mode, half }: { mode: 'light' | 'dark'; half?: boolean }) {
  return (
    <span className={cn('ds-appr-mock', mode === 'light' ? 'theme-light' : 'theme-dark')} data-half={half ? '' : undefined}>
      <span className="ds-appr-side">
        <span className="ds-appr-bar" />
        <span className="ds-appr-bar" />
        <span className="ds-appr-bar" />
      </span>
      <span className="ds-appr-main">
        <span className="ds-appr-bar ds-appr-head" />
        <span className="ds-appr-bar" />
        <span className="ds-appr-panel" />
      </span>
    </span>
  )
}

function systemMode(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** Writes the mode on <html>. System resolves to what the device asks for now. */
export function applyAppearance(value: Appearance) {
  document.documentElement.setAttribute('data-theme', value === 'system' ? systemMode() : value)
}

/** Put this in an inline script in <head>, so a stored mode is on the page before the first paint. */
export function appearanceInitScript(storageKey: string = DEFAULT_KEY) {
  const key = JSON.stringify(storageKey)
  return `(function(){try{var s=localStorage.getItem(${key});var t=s==='light'||s==='dark'?s:matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`
}

function isAppearance(v: string | null): v is Appearance {
  return v === 'light' || v === 'dark' || v === 'system'
}

export function AppearancePicker({
  value, defaultValue = 'system', onValueChange, storageKey = DEFAULT_KEY, legend = 'Theme', labels, className, ...rest
}: AppearancePickerProps) {
  useStyleOnce('ds-appr', CSS)
  const name = React.useId()
  const controlled = value !== undefined
  const [inner, setInner] = React.useState<Appearance>(defaultValue)
  const current = controlled ? value : inner

  // The server cannot read storage, so the stored choice arrives after mount. The cards keep their space meanwhile.
  React.useEffect(() => {
    if (controlled) return
    let stored: string | null = null
    try { stored = localStorage.getItem(storageKey) } catch { /* storage blocked: the choice lasts for this page only */ }
    if (!isAppearance(stored)) return
    setInner(stored)
    applyAppearance(stored)
  }, [controlled, storageKey])

  // While on system, follow the device when it changes.
  React.useEffect(() => {
    if (controlled || current !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const follow = () => applyAppearance('system')
    media.addEventListener('change', follow)
    return () => media.removeEventListener('change', follow)
  }, [controlled, current])

  function choose(next: Appearance) {
    if (!controlled) {
      setInner(next)
      try { localStorage.setItem(storageKey, next) } catch { /* see above */ }
      applyAppearance(next)
    }
    onValueChange?.(next)
  }

  return (
    <fieldset className={cn('ds-appr', className)} {...rest}>
      <legend className="ds-appr-legend">{legend}</legend>
      <div className="ds-appr-grid">
        {OPTIONS.map((option) => (
          <label key={option} className="ds-appr-opt">
            <input type="radio" name={name} value={option} checked={current === option} onChange={() => choose(option)} />
            <span className="ds-appr-frame" aria-hidden="true">
              <Screen mode={option === 'dark' ? 'dark' : 'light'} />
              {option === 'system' && <Screen mode="dark" half />}
            </span>
            <span className="ds-appr-name">{labels?.[option] ?? DEFAULT_LABELS[option]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
