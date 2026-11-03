'use client'

import * as React from 'react'
import { cn } from './_cn'

// SidebarNav. The app menu column: a header slot (workspace switcher or product name), grouped destinations with
// optional collapsible groups and counts, and a footer slot for the account. It collapses to a 56px icon rail:
// labels then move into the accessible name and a native title tooltip, so every item stays named.
// The active item is a surface step with full ink (aria-current="page"), never a colored bar or a glowing dot.
// For phones, render the same component inside a Drawer (blocks/drawer) or use AppShell, which does that for you.

export interface SidebarNavItem {
  id: string
  label: string
  href?: string
  onSelect?: () => void
  icon?: React.ReactNode
  count?: number
  active?: boolean
}

export interface SidebarNavGroup {
  id: string
  label?: string
  items: SidebarNavItem[]
  /** Lets people fold the group. Ignored while the rail is collapsed. */
  collapsible?: boolean
  defaultOpen?: boolean
}

export interface SidebarNavProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  groups: SidebarNavGroup[]
  header?: React.ReactNode
  /** Shown instead of the header while collapsed, usually a logo mark. */
  headerCollapsed?: React.ReactNode
  footer?: React.ReactNode
  /** Controlled collapse state. Leave undefined to let the component own it. */
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Hides the collapse button, for example inside a mobile drawer. */
  collapsible?: boolean
  label?: string
  collapseLabel?: string
  expandLabel?: string
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('shrink-0 transition-transform duration-press ease-out', open ? 'rotate-0' : '-rotate-90')}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function RailIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      {collapsed ? <path d="M13 10l2 2-2 2" /> : <path d="M15 10l-2 2 2 2" />}
    </svg>
  )
}

function Item({ item, collapsed }: { item: SidebarNavItem; collapsed: boolean }) {
  const cls = cn(
    'flex min-h-11 w-full items-center gap-2.5 rounded-md text-left text-sm outline-none desk:min-h-9',
    'transition-colors duration-press focus-visible:ring-2 focus-visible:ring-ring',
    collapsed ? 'justify-center px-0' : 'px-2.5',
    item.active ? 'bg-bg-elev font-medium text-text' : 'text-text-muted hover:bg-bg-elev hover:text-text',
  )
  const name = typeof item.count === 'number' ? `${item.label}, ${item.count}` : item.label
  const inner = (
    <>
      {item.icon ? (
        <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
          {item.icon}
        </span>
      ) : collapsed ? (
        <span className="flex size-5 shrink-0 items-center justify-center text-label font-semibold" aria-hidden="true">
          {item.label.slice(0, 1)}
        </span>
      ) : null}
      {!collapsed && <span className="min-w-0 flex-1 break-words">{item.label}</span>}
      {!collapsed && typeof item.count === 'number' && (
        <span className="shrink-0 text-label tabular-nums text-text-subtle">{item.count}</span>
      )}
    </>
  )
  const common = {
    className: cls,
    'aria-current': item.active ? ('page' as const) : undefined,
    'aria-label': collapsed ? name : undefined,
    title: collapsed ? name : undefined,
  }
  return item.href ? (
    <a href={item.href} {...common}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={item.onSelect} {...common}>
      {inner}
    </button>
  )
}

function Group({ group, collapsed }: { group: SidebarNavGroup; collapsed: boolean }) {
  const [open, setOpen] = React.useState(group.defaultOpen ?? true)
  const listId = React.useId()
  const foldable = Boolean(group.collapsible && group.label && !collapsed)
  const shown = collapsed || !foldable || open
  return (
    <div className="flex flex-col gap-0.5">
      {group.label && !collapsed && (
        foldable ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'flex min-h-11 w-full items-center gap-1.5 rounded-md px-2.5 text-left text-label font-medium text-text-subtle outline-none desk:min-h-7',
              'transition-colors duration-press hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <span className="flex-1">{group.label}</span>
            <Chevron open={open} />
          </button>
        ) : (
          <div className="px-2.5 pb-1 pt-1 text-label font-medium text-text-subtle">{group.label}</div>
        )
      )}
      {collapsed && group.label && <div className="mx-3 my-1 border-t border-border" aria-hidden="true" />}
      <ul id={listId} hidden={!shown} aria-label={collapsed ? group.label : undefined} className="flex flex-col gap-0.5">
        {group.items.map((item) => (
          <li key={item.id}>
            <Item item={item} collapsed={collapsed} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SidebarNav({
  groups,
  header,
  headerCollapsed,
  footer,
  collapsed: controlled,
  defaultCollapsed = false,
  onCollapsedChange,
  collapsible = true,
  label = 'Main',
  collapseLabel = 'Collapse menu',
  expandLabel = 'Expand menu',
  className,
  ...props
}: SidebarNavProps) {
  const [own, setOwn] = React.useState(defaultCollapsed)
  const collapsed = controlled ?? own
  const setCollapsed = (c: boolean) => {
    if (controlled === undefined) setOwn(c)
    onCollapsedChange?.(c)
  }

  return (
    <nav
      aria-label={label}
      className={cn(
        'flex h-full shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-dropdown ease-out',
        collapsed ? 'w-14' : 'w-60',
        className,
      )}
      {...props}
    >
      {(header || headerCollapsed) && (
        <div className={cn('flex min-h-12 shrink-0 items-center', collapsed ? 'justify-center px-1' : 'px-3')}>
          {collapsed ? headerCollapsed ?? null : header}
        </div>
      )}
      <div className={cn('flex flex-1 flex-col gap-4 overflow-y-auto py-2', collapsed ? 'px-1' : 'px-2')}>
        {groups.map((g) => (
          <Group key={g.id} group={g} collapsed={collapsed} />
        ))}
      </div>
      {(footer || collapsible) && (
        <div className={cn('flex shrink-0 items-center gap-2 border-t border-border py-2', collapsed ? 'flex-col px-1' : 'px-2')}>
          {footer && !collapsed && <div className="min-w-0 flex-1 px-1">{footer}</div>}
          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? expandLabel : collapseLabel}
              aria-expanded={!collapsed}
              title={collapsed ? expandLabel : collapseLabel}
              className={cn(
                'inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-muted outline-none desk:size-9',
                'transition-colors duration-press hover:bg-bg-elev hover:text-text focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <RailIcon collapsed={collapsed} />
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
