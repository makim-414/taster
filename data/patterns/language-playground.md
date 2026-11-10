---
id: language-playground
name: Language playground in the site shell
category: layout-shell
uses: [start-an-action, organize-the-page, navigate-the-site]
surfaces: [developer-docs]
replaces: []
components: [blocks/button, blocks/dropdown, blocks/tabs]
inspiration: []
status: stable
---

## When to use

Use it on the site of a programming language, a compiler, a query language or any developer tool that people try in the browser. These sites usually have four pages: a landing page, a guide, a reference and a playground. Visitors move between them in one sitting, so the four pages must read as one site.

The usual failure is the playground. It gets built on its own: the page turns dark from edge to edge, the header changes height and width, the editor and the output split the screen in half, and half of the screen stays empty until the first run. A visitor who clicked "Try it" from a light landing page lands somewhere that looks like another product.

## Anatomy

- Site header: the same component, height, column width, gutters and logo position on every page, the playground included. The playground adds nothing to it and overrides nothing in it.
- Page: the site's own background and type. The playground does not switch the whole page to a dark theme.
- Title row: the page name at left, aligned to the logo's left edge. At right, one primary action (Run) and one secondary menu (More) for everything else: check, format, examples, settings, sharing, reset.
- Code card: one surface with rounded corners inside the page column. Only this card is dark (or light, if the site's code blocks are light). Inside it, from top to bottom:
  - file tabs, with a quiet Copy action at the right end;
  - the editor, which fills the remaining height;
  - a small footer with the language name and the line count in tabular numerals.
- Output: opens under the code, inside the same card, on the first Run. It sits one step lighter than the code so the two read as separate surfaces. It has Output and History tabs and a Close action. Run opens it again.
- Status line: one quiet line under the card for what just happened (run complete, draft saved).
- Phone: the code card spans the full width, and Source and Output become two tabs. Run switches to Output.

## Do

- Reuse the landing page's header exactly. Measure it: the header rectangle, the logo position and the navigation's right edge should match the landing page at every width.
- Make Run the same primary button as the landing page's main call to action, so the action the visitor came for looks the same on both pages.
- Keep the code colors in tokens: page, chrome, raised panel, line, text, muted text, selection, and one token per syntax category. Check every syntax color and the muted text against the code background and against the selection color at 4.5:1.
- Keep the editor full height and let the output take part of it only after a run (about 3 to 2 is a good split).
- Show compiler errors in the output panel. A missing optional field in an error object must never blank the page.
- Keep the examples in the More menu, not as a row of buttons above the editor.
- Before you hand it over, type a syntax error and press Run: the error shows in the output and the page stays. Check 360, 768, 1024, 1440 and 1920 px for horizontal scroll and for an empty half of the screen.

## Don't

- Do not turn the whole page dark on the playground when the landing page, guide and reference are light. The jump in brightness on every navigation breaks the site in two.
- Do not give the playground its own header height, width or padding.
- Do not split the editor and the output side by side by default. Before the first run, half of the screen is empty. Use a side-by-side split only when comparing source and a long record is the main job of the page.
- Do not put a second primary button next to Run. Check, format and replay are secondary.
- Do not invent a brand color for the Run button when the site has none. Use the primary button the site already has.
- Do not hardcode hex values in the playground stylesheet. Map the dark roles onto shared tokens.

## Swap recipe

Slop: the playground is a separate dark app with its own header and an empty right half.

```css
/* before */
body:has(.playground) { background: #111; color: #eee; }
body:has(.playground) .site-header { width: 100%; height: 4rem; padding-inline: 1.25rem; }
.playground-panels { display: grid; grid-template-columns: 1fr 1fr; }
```

Fixed: the site shell stays as it is, and only the code card is dark.

```css
/* after */
.playground { padding-block: 0 var(--page-gutter); height: calc(100dvh - var(--header-height)); }
.playground-panels {
  color-scheme: dark;
  --paper: var(--code-paper);
  --ink: var(--code-ink);
  --muted: var(--code-muted);
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--paper);
}
.playground-panels[data-output="closed"] .output-panel { display: none; }
.playground-panels[data-output="open"] { grid-template-rows: minmax(0, 3fr) minmax(0, 2fr); }
.playground-panels .output-panel { --paper: var(--code-raised); }
@media (max-width: 48rem) {
  .playground { padding: 0; }
  .playground-panels { border-radius: 0; }
}
```


## Tokens

- Page and header: the site's own `--bg`, `--text`, `--text-muted` and `--border`, unchanged on the playground.
- Code card: define one group of code roles next to the site tokens and map them onto the card only: `--code-chrome` (tab bar and footer), `--code-paper` (editor), `--code-raised` (output), `--code-line`, `--code-ink`, `--code-muted`, `--code-selected`, `--code-focus`, and one `--syntax-*` token per category. Map them by overriding the site roles inside the card (`--paper: var(--code-paper)`), so every component inside keeps reading the usual names.
- Type: `--font-mono` for code and values only. The tabs, footer, buttons and status line stay in the UI font, with `font-variant-numeric: tabular-nums` for the line count.
- Radius: `--r-card` on the code card, none below 768px where the card spans the width. Space: the page gutter on the left and right of the card and under it.
- Primary action: the site's primary button tokens, the same as the landing call to action.
