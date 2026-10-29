---
id: site-header
name: Site header
category: nav-header
uses: [navigate-the-site]
surfaces: [landing, commerce, editorial]
replaces: [AC-01, CMP-05, ICO-01, LAY-06]
components: [blocks/dropdown, blocks/button, blocks/liquid-nav]
inspiration: []
status: stable
---

## When to use

Top of a marketing, store or editorial site where people arrive cold and need to find three or four destinations plus one action. Use the mega menu variant only when a section has more than five children that need a sentence of explanation. For a single-purpose page (waitlist, event, one product) use the minimal variant: wordmark left, one button right, no links at all.

Do not use it for signed-in product screens. Those want an app bar plus a sidebar (see app-bars and collapsible-sidebar).

## Anatomy

- Wordmark or logo on the left, 24 to 28px tall, linking home.
- Primary links, three to five, in normal case at 14px, medium weight. Muted ink by default, full ink on hover and for the current page (`aria-current="page"`).
- One action on the right. Solid button for the main conversion, plain text link for sign in. Never two solid buttons.
- Optional locale switch that shows codes (EN, KO), not flags.
- Bar behavior: fully transparent at scroll position 0, then an opaque `--bg` fill with a 1px `--border` bottom line after the first few pixels of scroll. No blur on the bar itself.
- Mega menu: a panel under the bar with text-led items. Each item is a label and one short description line. No icon per item, no colored icon tile.
- Mobile: wordmark, one button and a menu button that opens a full-height sheet with the same links in a single column.

## Do

- Switch the bar from transparent to solid with a scroll listener or an IntersectionObserver on a 1px sentinel at the top of the page.
- Set link labels in sentence case with default letter spacing. Navigation is the one place all caps is tolerated, but sentence case reads faster and fits more languages.
- Give related things tight spacing and unrelated things wide spacing: 12px between the action buttons, 24px between links, 40px between the wordmark and the first link.
- Keep the current page distinguishable without color: full ink plus a 1px underline offset by 6px.
- Make the hit area at least 44px tall on touch even when the text is 14px.

## Don't

- Don't fix a translucent blurred bar over the hero. Content slides under it and every label becomes a contrast test.
- Don't uppercase and track the links (`text-transform: uppercase; letter-spacing: 0.12em`). It is the most common tell of a generated header.
- Don't put a Lucide bolt, shield or sparkle in front of every menu item. Use text. If an icon is needed, draw one that means something specific.
- Don't use the same 32px gap everywhere. A header with one rhythm looks like a flex row with `gap-8` and nothing else.
- Don't hide the main action in a hamburger on desktop.

## Swap recipe

Slop version (fixes AC-01, CMP-05, ICO-01, LAY-06):

```css
.nav {
  position: fixed; inset: 0 0 auto 0; height: 72px;
  display: flex; align-items: center; justify-content: center; gap: 32px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px);
}
.nav a {
  text-transform: uppercase; letter-spacing: 0.14em; font-size: 11px;
}
.nav a svg { width: 16px; margin-right: 6px; } /* lucide zap, shield, sparkles */
```

Fixed version, using the registry button and dropdown:

```tsx
import { Button } from './blocks/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './blocks/dropdown'

function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = React.useState(false)
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > offset)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [offset])
  return scrolled
}

export function SiteHeader() {
  const scrolled = useScrolled()
  return (
    <header
      className={
        'sticky top-0 z-30 h-14 border-b transition-colors ' +
        (scrolled ? 'border-border bg-bg' : 'border-transparent bg-transparent')
      }
    >
      <div className="mx-auto flex h-full max-w-6xl items-center px-5">
        <a href="/" className="mr-10 font-semibold">Wordmark</a>
        <nav className="flex items-center gap-6 text-sm text-text-muted">
          <a href="/product" className="hover:text-text">Product</a>
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:text-text">Resources</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Guides</DropdownMenuItem>
              <DropdownMenuItem>Changelog</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <a href="/pricing" className="hover:text-text">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <a href="/login" className="text-sm text-text-muted hover:text-text">Sign in</a>
          <Button size="sm">Start free</Button>
        </div>
      </div>
    </header>
  )
}
```

## Tokens

- Surfaces: `--bg` (solid state), transparent at rest. Line: `--border`.
- Ink: `--text` for the wordmark and current link, `--text-muted` for the rest, `--text-subtle` for the locale code that is not selected.
- Type: `--t-body` (14px) for links, `--w-med` for weight. Default letter spacing.
- Space: `--sp-3` between actions, `--sp-6` between links, `--sp-12` after the wordmark. Bar height 56px (`--sp-12` plus `--sp-2`).
- Motion: `--dur-dropdown` with `--ease-out` for the mega panel; the bar color change uses 160ms (`--dur-press`).
- Radius: `--r-md` on the mega panel; the bar itself has none.
