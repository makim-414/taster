---
id: collapsible-sidebar
name: Collapsible sidebar
category: sidebar
uses: [navigate-the-app]
surfaces: [app, dashboard]
replaces: [AC-10, COL-06]
components: [blocks/app-shell, blocks/dropdown]
inspiration: [https://ui.shadcn.com/docs/components/sidebar]
status: stable
---

## When to use

Signed-in products with more than five destinations that people move between all day: dashboards, admin tools, workspaces. The sidebar holds destinations; the top bar holds page actions.

With fewer than five destinations, a top tab row is lighter. With a flat two-level menu that never changes, skip the collapse behavior.

## Anatomy

- Width 240px expanded, 56px collapsed to an icon rail, off-canvas drawer below the tablet breakpoint.
- Top: workspace switcher (a dropdown trigger showing the current workspace). Registry `DropdownMenu` fits here.
- Middle: grouped items. Group labels are 12px, sentence case, subtle ink. Item: icon (optional), label, optional count in a bordered chip.
- Active item: a surface step (`--bg-elev`) with full ink and medium weight. No colored left bar, no glowing dot.
- Optional single sliding indicator: one element that moves between links with `transform`, instead of each link having its own highlight.
- Bottom: account and theme controls behind a `border-t`.
- In `AppShell`, items are `NavItem` objects: `label`, `href` or `onClick`, `icon`, `active`, `count`, `group`. Items sharing a `group` string are grouped; the shell renders the drawer on mobile.

## Do

- Persist the collapsed state per user, and default to expanded on first visit so labels are learnable.
- Add `title` or a tooltip to rail icons, and keep `aria-label` on every icon-only link.
- Close the mobile drawer on route change and on Escape, trap focus while it is open, and lock body scroll.
- Make the active item readable in grayscale: lightness step plus weight.
- Keep the order stable. Do not reorder items by usage; muscle memory is the point.

## Don't

- Don't mark the active item with a thick 3px colored left border on a rounded row. It is the card-with-side-stripe look.
- Don't add a pulsing dot or glow to the current page.
- Don't give every group a different accent color or icon tile.
- Don't nest more than two levels. A third level belongs in the page, as tabs.
- Don't animate width with layout properties on every frame if the content reflows; animate the rail with `transform` and fade labels.

## Swap recipe

Slop version (fixes AC-10, COL-06):

```css
.nav-item.active {
  background: rgba(99, 102, 241, 0.12);
  border-left: 3px solid #6366f1;
  border-radius: 8px;
  box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);
}
.nav-item .icon { background: rgba(236, 72, 153, 0.15); } /* each icon its own tint */
```

Fixed version:

```tsx
import { AppShell, type NavItem } from './blocks/app-shell'

const nav: NavItem[] = [
  { label: 'Overview', href: '/', active: true },
  { label: 'Orders', href: '/orders', group: 'Sell', count: 8 },
  { label: 'Products', href: '/products', group: 'Sell' },
  { label: 'Settings', href: '/settings', group: 'Account' },
]

<AppShell brand="Wordmark" nav={nav} title="Overview">{children}</AppShell>
```

The active row in the shell is `bg-bg-elev font-medium text-text`; inactive rows are `text-text-muted hover:text-text`. The sidebar surface is `--sidebar` with a `--border` right edge. Add the rail by switching the aside width between `w-60` and `w-14` and hiding the label spans.

## Tokens

- Surfaces: `--sidebar` for the panel, `--bg-elev` for the active row, `--sidebar-border` or `--border` for the edge.
- Ink: `--text` active, `--text-muted` rest, `--text-subtle` for group labels and counts.
- Type: `--t-body` (14px) items, `--t-sm` (12px) group labels.
- Space: row padding `--sp-2` by `--sp-3`, group gap `--sp-4`, panel width 240px.
- Radius: `--r-md` rows. Motion: `--dur-dropdown` with `--ease-drawer` for the drawer, `--dur-press` for hover.
