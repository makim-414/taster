'use client'

import * as React from 'react'
import { cn } from './_cn'

// AppShell. Sidebar plus sticky top bar plus content column, tokens only, no Radix.
// The brand is a prop (never hardcoded). Mobile gets a drawer, desktop a fixed sidebar.

export interface NavItem {
  label: string
  href?: string
  onClick?: () => void
  icon?: React.ReactNode
  active?: boolean
  count?: number
  group?: string
}

export interface AppShellProps {
  brand: React.ReactNode
  nav: NavItem[]
  title?: string
  subtitle?: string
  rightSlot?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  contentClassName?: string
}

function NavLink({ item }: { item: NavItem }) {
  const cls = cn(
    'group flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors outline-none',
    'focus-visible:ring-2 focus-visible:ring-ring',
    item.active ? 'bg-bg-elev font-medium text-text' : 'text-text-muted hover:text-text',
  )
  const inner = (
    <>
      {item.icon && <span className="shrink-0">{item.icon}</span>}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {typeof item.count === 'number' && (
        <span className="shrink-0 rounded-full border border-border px-1.5 text-xs tabular-nums text-text-subtle">
          {item.count}
        </span>
      )}
    </>
  )
  if (item.href) {
    return (
      <a href={item.href} aria-current={item.active ? 'page' : undefined} className={cls}>
        {inner}
      </a>
    )
  }
  return (
    <button type="button" onClick={item.onClick} aria-current={item.active ? 'page' : undefined} className={cls}>
      {inner}
    </button>
  )
}

function SidebarBody({ brand, nav, footer }: Pick<AppShellProps, 'brand' | 'nav' | 'footer'>) {
  const groups: { name: string | null; items: NavItem[] }[] = []
  for (const item of nav) {
    const name = item.group ?? null
    const last = groups[groups.length - 1]
    if (last && last.name === name) last.items.push(item)
    else groups.push({ name, items: [item] })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center px-3 font-semibold">{brand}</div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-2">
        {groups.map((g, gi) => (
          <div key={gi} className="space-y-0.5">
            {g.name && (
              <div className="px-2.5 pb-1 text-xs font-medium text-text-subtle">{g.name}</div>
            )}
            {g.items.map((item, ii) => (
              <NavLink key={ii} item={item} />
            ))}
          </div>
        ))}
      </nav>
      {footer && <div className="shrink-0 border-t border-border px-3 py-3">{footer}</div>}
    </div>
  )
}

export function AppShell({
  brand,
  nav,
  title,
  subtitle,
  rightSlot,
  footer,
  children,
  contentClassName,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const showHeader = Boolean(title || subtitle || rightSlot)

  React.useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-sidebar md:block">
        <SidebarBody brand={brand} nav={nav} footer={footer} />
      </aside>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 md:hidden"
            style={{ background: 'var(--scrim)' }}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[min(280px,86vw)] border-r border-border bg-sidebar md:hidden">
            <SidebarBody brand={brand} nav={nav} footer={footer} />
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {showHeader && (
          <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-bg-elev px-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="-ml-1 rounded-md p-1 text-text-muted transition-colors hover:text-text md:hidden"
            >
              <MenuIcon />
            </button>
            <div className="min-w-0">
              {title && <div className="truncate text-base font-semibold leading-tight">{title}</div>}
              {subtitle && <div className="truncate text-xs text-text-muted">{subtitle}</div>}
            </div>
            {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
          </header>
        )}
        <main className={cn('mx-auto w-full max-w-6xl flex-1 px-5 py-6', contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  )
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
