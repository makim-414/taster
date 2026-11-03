import * as React from 'react'
import { cn } from '../blocks/_cn'

// Site header: the wordmark on the left, three to five primary links, a quiet sign-in link and one solid
// action on the right. A link can open a text-led menu panel (a label and one line each, no icon tiles).
// On phones the links move into a full-height sheet opened by a menu button, built on the native <dialog>
// element, so focus is held inside, Escape closes it and the page behind is inert, with no dependency.
// Follows patterns/site-header: normal case links at 14px, aria-current on the current page, transparent
// at the top and an opaque surface with a hairline once the page scrolls (when `sticky`), no blur, never
// two solid buttons, and the main action stays visible on phones.
// Original code, MIT.

export interface HeaderLink {
  label: string
  href: string
  current?: boolean
  /** Turns the link into a menu button that opens a panel of these items. */
  items?: { label: string; href: string; description?: string }[]
}

export interface SiteHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** The supplied wordmark or logo. */
  brand: React.ReactNode
  brandHref?: string
  links: HeaderLink[]
  signIn?: { label: string; href: string }
  action?: { label: string; href: string }
  /** Stick to the top of the page and gain a surface after the first few pixels of scroll. */
  sticky?: boolean
  menuLabel?: string
  closeLabel?: string
}

const KEEP = 'break-keep [overflow-wrap:break-word]'
const NAV_LINK =
  'inline-flex h-11 items-center gap-1 rounded-sm px-3 text-sm font-medium text-text-muted outline-none transition-colors duration-press ease-out ' +
  'hover:text-text focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:text-text aria-expanded:text-text desk:h-9'
const SOLID =
  'inline-flex h-11 items-center justify-center whitespace-nowrap rounded-md bg-accent px-4 text-sm font-medium text-accent-fg outline-none ' +
  'transition-[opacity,transform] duration-press ease-out hover:opacity-90 active:scale-press focus-visible:ring-2 focus-visible:ring-ring desk:h-9'

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function MenuLink({ link }: { link: HeaderLink }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLLIElement>(null)
  const panelId = React.useId()
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        ;(ref.current?.querySelector('button') as HTMLButtonElement | null)?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <li ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)} className={NAV_LINK}>
        {link.label}
        <Chevron className={cn('transition-transform duration-dropdown ease-out', open && 'rotate-180')} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false)
        }}
        className="absolute left-0 top-full z-20 mt-2 w-[360px] rounded-xl border border-border bg-bg-popover p-2 shadow-pop"
      >
        <ul className="m-0 grid list-none p-0">
          {link.items?.map((it) => (
            <li key={it.href + it.label}>
              <a href={it.href} className="block rounded-md px-3 py-3 outline-none transition-colors duration-press ease-out hover:bg-bg-sunken focus-visible:ring-2 focus-visible:ring-ring">
                <span className={cn('block text-sm font-medium text-text', KEEP)}>{it.label}</span>
                {it.description ? <span className={cn('mt-0.5 block text-label text-text-muted', KEEP)}>{it.description}</span> : null}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </li>
  )
}

export function SiteHeader({
  brand,
  brandHref = '/',
  links,
  signIn,
  action,
  sticky = false,
  menuLabel = 'Menu',
  closeLabel = 'Close menu',
  className,
  ...props
}: SiteHeaderProps) {
  const [scrolled, setScrolled] = React.useState(false)
  const sheet = React.useRef<HTMLDialogElement>(null)
  const sheetTitle = React.useId()

  React.useEffect(() => {
    if (!sticky) return
    const on = () => setScrolled(window.scrollY > 4)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [sticky])

  return (
    <header
      className={cn(
        'z-30 border-b transition-colors duration-dropdown ease-out',
        sticky ? 'sticky top-0' : 'relative',
        sticky && !scrolled ? 'border-transparent bg-transparent' : 'border-border bg-bg',
        className,
      )}
      {...props}
    >
      <div className="flex h-16 items-center gap-4">
        <a href={brandHref} className="inline-flex h-11 shrink-0 items-center rounded-sm text-title font-semibold text-text outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {brand}
        </a>
        <nav aria-label="Main" className="ml-4 hidden lg:block">
          <ul className="m-0 flex list-none items-center gap-1 p-0">
            {links.map((l) =>
              l.items?.length ? (
                <MenuLink key={l.label} link={l} />
              ) : (
                <li key={l.href + l.label}>
                  <a href={l.href} aria-current={l.current ? 'page' : undefined} className={NAV_LINK}>
                    {l.label}
                  </a>
                </li>
              ),
            )}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {signIn ? (
            <a href={signIn.href} className={cn(NAV_LINK, 'hidden sm:inline-flex')}>
              {signIn.label}
            </a>
          ) : null}
          {action ? (
            <a href={action.href} className={SOLID}>
              {action.label}
            </a>
          ) : null}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => sheet.current?.showModal()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text outline-none hover:bg-bg-sunken focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <span className="sr-only">{menuLabel}</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      <dialog
        ref={sheet}
        aria-labelledby={sheetTitle}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close()
        }}
        className="m-0 ml-auto h-full max-h-none w-full max-w-sm bg-bg p-0 text-text backdrop:bg-scrim open:flex open:flex-col"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <span id={sheetTitle} className="text-title font-semibold">
            {menuLabel}
          </span>
          <button
            type="button"
            onClick={() => sheet.current?.close()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md outline-none hover:bg-bg-sunken focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="sr-only">{closeLabel}</span>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="m-0 grid list-none gap-1 p-0">
            {links.map((l) => (
              <li key={l.href + l.label}>
                <a
                  href={l.href}
                  aria-current={l.current ? 'page' : undefined}
                  className={cn('flex min-h-12 items-center rounded-md px-3 text-title font-medium text-text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:text-text', KEEP)}
                >
                  {l.label}
                </a>
                {l.items?.length ? (
                  <ul className="m-0 mb-2 grid list-none p-0 pl-3">
                    {l.items.map((it) => (
                      <li key={it.href + it.label}>
                        <a href={it.href} className={cn('flex min-h-11 items-center rounded-md px-3 text-body text-text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring', KEEP)}>
                          {it.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
        {signIn ? (
          <div className="border-t border-border p-4">
            <a href={signIn.href} className="flex h-11 items-center justify-center rounded-md border border-border text-body font-medium text-text outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {signIn.label}
            </a>
          </div>
        ) : null}
      </dialog>
    </header>
  )
}
