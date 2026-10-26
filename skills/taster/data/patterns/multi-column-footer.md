---
id: multi-column-footer
name: Multi-column footer
category: footer
uses: [navigate-the-site]
surfaces: [landing, commerce]
replaces: [AC-01, CMP-10]
components: []
inspiration: []
status: stable
---

## When to use

Marketing and store sites with more than about eight pages, where a visitor who reached the bottom is looking for something specific: pricing, contact, returns, legal. A footer is a sitemap and a place to show who runs the business. It is not a second sales pitch.

For a site with two or three pages, use the slim legal footer instead.

## Anatomy

- Left block: wordmark and one sentence saying what the company does, at most 90 characters.
- Three or four link columns, each with a heading in sentence case (Product, Company, Resources, Legal) and four to seven links. Column headings at 14px medium, links at 14px muted.
- Business block: registered company name, registration or tax number where the law asks for it, postal address, and one contact email. This is what makes a footer look like it belongs to a real company.
- Bottom row: copyright with the year, language switch if any, and links to terms and privacy. A 1px top border separates it from the columns.
- No newsletter form by default. Add one only when someone actually sends the newsletter.

## Do

- Use real column counts. Three columns with five links each beats five columns with two links each.
- Keep headings and links in normal case. Footers are where all caps with letter spacing piles up the fastest, and they are read on small screens.
- Make the contact email a real `mailto:` link and reply to it.
- On mobile, collapse columns to a two-column grid, not an accordion. Links should be visible without a tap.
- Give the footer more vertical air than the page above it: 64px above the columns, 32px between the columns and the bottom row.

## Don't

- Don't end the page with "Stay in the loop" and an email field when nothing is sent. Showing a thank-you message with no list behind it is a lie.
- Don't repeat the main call to action in a large band directly above the footer on every page.
- Don't list social icons as the only contact method.
- Don't use a different gray for each column heading, or a gradient divider.
- Don't write "Made with love" or a fake award strip.

## Swap recipe

Slop version (fixes AC-01, CMP-10):

```html
<footer class="footer">
  <h4 style="text-transform:uppercase;letter-spacing:0.16em;font-size:11px">Product</h4>
  ...
  <form class="newsletter">
    <input type="email" placeholder="you@company.com" />
    <button>Subscribe</button>  <!-- posts nowhere -->
  </form>
</footer>
```

Fixed version:

```tsx
<footer className="border-t border-border bg-bg">
  <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
    <div>
      <div className="font-semibold">Wordmark</div>
      <p className="mt-2 max-w-xs text-sm text-text-muted">Invoicing for small studios.</p>
    </div>
    {columns.map((col) => (
      <div key={col.title}>
        <h3 className="text-sm font-medium text-text">{col.title}</h3>
        <ul className="mt-3 space-y-2 text-sm text-text-muted">
          {col.links.map((l) => (
            <li key={l.href}><a href={l.href} className="hover:text-text">{l.label}</a></li>
          ))}
        </ul>
      </div>
    ))}
  </div>
  <div className="border-t border-border-soft">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-6 text-xs text-text-subtle">
      <span>Example Studio Ltd. Company no. 000000. 1 Example Street, Town</span>
      <a href="mailto:hello@example.com" className="hover:text-text">hello@example.com</a>
      <span className="ml-auto">2026</span>
    </div>
  </div>
</footer>
```

## Tokens

- Surfaces: `--bg` with a `--border` top line; the bottom row is separated with `--border-soft`.
- Ink: `--text` for column headings, `--text-muted` for links, `--text-subtle` for the legal row.
- Type: `--t-body` for headings and links, `--t-sm` for the business block, no uppercase transform.
- Space: `--sp-16` above the columns, `--sp-12` gap between column groups at wide widths, `--sp-3` between links, `--sp-6` in the bottom row.
- Radius and shadow: none.
