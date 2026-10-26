---
id: app-bars
name: App bars
category: nav-header
uses: [navigate-the-app]
surfaces: [app, dashboard]
replaces: [CMP-05]
components: [blocks/app-shell, blocks/tabs]
inspiration: []
status: stable
---

## When to use

Inside a signed-in product, where the page below the bar changes and the bar itself stays put. The top bar names the current page and holds the two or three actions that belong to it. On phones, the main destinations move into a bottom tab bar because the thumb reaches there and the top corner does not.

Do not use it for a marketing page. That is the site header's job.

## Anatomy

- Top bar, 48px tall, sticky, `--bg-elev` fill with a 1px bottom border. Left: sidebar toggle (menu icon below the desktop breakpoint), then the page title at 16px semibold and an optional one-line subtitle in muted 12px.
- Right slot: page-level actions only. One solid button at most, the rest ghost or icon buttons. Theme and account menus live in the sidebar footer, not here.
- Bottom tab bar on phones: three to five destinations, each an icon with a 11px label, the current one in full ink and the others muted. Opaque fill, 1px top border, safe-area padding at the bottom.
- The registry shell wires this together: `AppShell` takes `brand`, `nav`, `title`, `subtitle` and `rightSlot`, shows a drawer on mobile and a fixed sidebar on desktop.

## Do

- Keep the title in the bar the same string as the page `<h1>`. Do not repeat a second big heading right under it unless the page needs one.
- Use `aria-current="page"` on the active tab and make labels visible. Icon-only tab bars fail anyone who does not already know the icons.
- Hide the tab bar while a text field has focus so it does not ride up on the keyboard.
- Put destinations in the bar and actions in the top bar. A destination changes the page, an action changes the data.
- Honor `env(safe-area-inset-bottom)` so the labels clear the home indicator.

## Don't

- Don't float a blurred, rounded pill tab bar over content. It hides the last row of the list and looks identical in every generated app.
- Don't put more than five tabs. The sixth goes into a "More" sheet or the sidebar.
- Don't stack breadcrumbs, a title, a subtitle and tabs in the top bar. Pick the two that carry meaning.
- Don't give every bar button a different color. Ink and one solid button is enough.
- Don't make the top bar taller on scroll or hide it on scroll up if the page has page-level actions.

## Swap recipe

Slop version (fixes CMP-05):

```tsx
<nav className="fixed bottom-4 left-4 right-4 flex justify-around rounded-3xl
                bg-white/10 backdrop-blur-xl shadow-2xl p-3">
  {tabs.map((t) => <button key={t.id}><t.Icon /></button>)}
</nav>
```

Fixed version:

```tsx
import { AppShell } from './blocks/app-shell'

<AppShell
  brand="Wordmark"
  title="Invoices"
  subtitle="Last 30 days"
  rightSlot={<Button size="sm">New invoice</Button>}
  nav={[
    { label: 'Overview', href: '/', active: false },
    { label: 'Invoices', href: '/invoices', active: true, count: 12 },
    { label: 'Customers', href: '/customers' },
  ]}
>
  {children}
</AppShell>

/* phone tab bar */
<nav
  aria-label="Primary"
  className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
>
  {tabs.map((t) => (
    <a
      key={t.href}
      href={t.href}
      aria-current={t.active ? 'page' : undefined}
      className={'flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-caption ' +
        (t.active ? 'text-text' : 'text-text-muted')}
    >
      <t.Icon width={20} height={20} />
      {t.label}
    </a>
  ))}
</nav>
```

## Tokens

- Surfaces: `--bg-elev` for the top bar, `--bg` for the tab bar, `--border` for both rules. No `--sh-pop` shadow; neither bar floats.
- Ink: `--text` for title and active tab, `--text-muted` for subtitle and inactive tabs.
- Type: `--t-title` (16px) semibold for the title, `--t-xs` (11px) for tab labels, `--t-sm` (12px) for the subtitle.
- Space: bar height 48px (`--sp-12`), horizontal padding `--sp-4`, tab bar height 56px.
- Radius: none on bars; `--r-md` on the focus ring of bar buttons.
- Motion: only the color change on press, `--dur-press`.
