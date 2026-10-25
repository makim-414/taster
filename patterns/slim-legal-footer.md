---
id: slim-legal-footer
name: Slim legal footer
category: footer
uses: [navigate-the-site]
surfaces: [editorial, app]
replaces: [CMP-10]
components: []
inspiration: []
status: stable
---

## When to use

Pages that do not need a sitemap: an article, a one-page product, a signed-in app, a locked or error screen. The footer only answers "who is behind this" and "where are the terms". A single row is enough.

If visitors regularly look for pricing, contact or returns at the bottom, you need the multi-column footer, not this one.

## Anatomy

- One row, 48 to 56px tall, separated from the content by a 1px `--border-soft` line.
- Left: copyright with year and the company or author name.
- Right (or wrapping below on phones): terms, privacy, and a contact link. Three links at most.
- Optional: a status link or version string in subtle ink, only in apps.
- In a signed-in app, the row sits at the bottom of the content column, not fixed to the viewport, so it never covers anything.

## Do

- Use `margin-top: auto` inside a flex column page so the row sits at the bottom of short pages instead of floating in the middle.
- Keep text at 12px in `--text-subtle`. It is reference information and should be quiet but readable (4.5:1 against the surface).
- Make links real anchors with visible focus rings. Legal links are the ones someone will tab to.
- Say the actual entity name. "Example Studio Ltd." beats "All rights reserved."
- Collapse to two stacked lines on phones, copyright first.

## Don't

- Don't add social icons, a logo wall or a newsletter field to a page that chose the slim footer.
- Don't fix the footer to the bottom of the viewport. It will cover content and fight the mobile keyboard.
- Don't center everything with dots between the items. A left and right split scans better.
- Don't use a gradient or blurred glass bar for legal links.
- Don't hide the footer on locked screens if the law asks for it to be there.

## Swap recipe

Slop version (fixes CMP-10):

```html
<footer class="fixed bottom-0 w-full backdrop-blur text-center">
  <p>Join 10,000+ readers</p>
  <input type="email" /><button>Subscribe</button>
  <p>Made with love</p>
</footer>
```

Fixed version:

```tsx
export function LegalFooter() {
  return (
    <footer className="mt-auto border-t border-border-soft">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 text-xs text-text-subtle">
        <span>2026 Example Studio Ltd.</span>
        <nav aria-label="Legal" className="ml-auto flex gap-5">
          <a href="/terms" className="hover:text-text">Terms</a>
          <a href="/privacy" className="hover:text-text">Privacy</a>
          <a href="mailto:hello@example.com" className="hover:text-text">Contact</a>
        </nav>
      </div>
    </footer>
  )
}

/* page wrapper */
<div className="flex min-h-screen flex-col">
  <main className="flex-1">{children}</main>
  <LegalFooter />
</div>
```

## Tokens

- Surfaces: page `--bg`; the row has no fill of its own, only a `--border-soft` top line.
- Ink: `--text-subtle` at rest, `--text` on hover and focus.
- Type: `--t-sm` (12px), default tracking, sentence case.
- Space: row padding `--sp-4` vertical, `--sp-5` horizontal, `--sp-5` between links.
- Radius, shadow and blur: none.
