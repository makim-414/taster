---
id: app-shell
name: App shell
category: layout-shell
uses: [navigate-the-app, organize-the-page]
surfaces: [app, dashboard]
replaces: []
components: [blocks/app-shell]
inspiration: []
status: stable
---

## When to use

Use it for any signed-in product with more than three destinations: a dashboard, an admin, a workspace, a tool suite. The shell is the frame that does not change while pages do: sidebar navigation, a sticky top bar for title and actions, and a content area. Build it once and put every route inside it.

For a single-purpose tool with one screen, skip the sidebar and use a plain top bar. Auth screens and marketing pages sit outside the shell.

## Anatomy

- Sidebar: 240px wide on desktop (`md` and up), `--sidebar` surface, 1px `--sidebar-border` on its right edge. Brand at the top (a prop, never hardcoded), grouped nav items, optional footer for account or plan.
- Nav item: icon (optional), label truncated to one line, optional count in tabular numerals. Active item has a surface step (`--bg-elev`) and weight 500, with `aria-current="page"`.
- Top bar: 48px, sticky, `--bg-elev` with a bottom hairline. Title and subtitle at left, actions at right. A menu button appears below `md`.
- Drawer: on small screens the sidebar becomes a drawer over a `--scrim`, closes on Escape and on scrim click.
- Content: `max-width` around 72rem, centered, `--sp-5` horizontal padding, `--sp-6` vertical.

## Do

- Pass nav as data (label, href, icon, group, count) and let the shell render it.
- Keep the active state quiet: surface and weight, not a colored bar or fill.
- Group items under small muted headings when you have more than seven.
- Make the sidebar its own scroll container so long nav does not push the footer away.
- Test the drawer with keyboard only: open, tab through, Escape to close, focus returns to the menu button.

## Don't

- Do not hardcode a product name or logo inside the shell component.
- Do not put a colored indicator bar on the active item. See status-without-side-bar for the same mistake on cards.
- Do not nest a second sidebar inside the first. Use tabs or a sub-navigation in the content area.
- Do not use a full-width bottom tab bar and a sidebar together on the same breakpoint.
- Do not put page-specific filters into the global top bar.

## Swap recipe

Slop: each page rebuilds its own header, with a different nav on each.

```jsx
{/* before */}
<div className="min-h-screen bg-gradient-to-br from-slate-900 to-indigo-950">
  <header className="flex gap-6 p-4">{/* page-specific nav copy-pasted per route */}</header>
  <main className="p-8">...</main>
</div>
```

Fixed: one shell, data-driven nav.

```tsx
import { AppShell } from './blocks/app-shell'

{/* after */}
<AppShell
  brand={<Logo />}
  title="Reports"
  subtitle="Last updated 09:12"
  rightSlot={<Button>Export</Button>}
  nav={[
    { label: 'Overview', href: '/', active: true, group: 'Analyze' },
    { label: 'Reports', href: '/reports', count: 12, group: 'Analyze' },
    { label: 'Settings', href: '/settings', group: 'Account' },
  ]}
>
  {children}
</AppShell>
```

## Tokens

`--sidebar`, `--sidebar-border`, `--bg`, `--bg-elev`, `--border`, `--scrim`, `--text`, `--text-muted`, `--text-subtle`, `--sp-3`, `--sp-5`, `--sp-6`, `--r-md`. Breakpoint `md` (768px) switches sidebar to drawer. Tailwind: `bg-sidebar`, `border-sidebar-border`, `w-60`, `max-w-6xl`.
