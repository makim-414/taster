---
id: in-page-toc
name: On this page
category: tabs-segmented
uses: [read-long-text, organize-the-page]
surfaces: [editorial, app]
replaces: [AC-10, AC-01]
components: [blocks/page-toc]
inspiration: []
status: draft
---

## When to use

A long page with sections people jump between: a guide, a policy, release notes, a long settings page. The list shows where the reader is and lets them move to another section of the same page without losing their place.

For fewer than three sections, leave it out. For moving between pages of a product, use the sidebar or tabs instead.

## Anatomy

- A small heading ("On this page") in subtle ink, sentence case, then one link per section heading. Second level headings are indented, deeper levels are left out.
- One hairline rail on the left of the list. The section in view gets full ink and medium weight with `aria-current="location"`; the others stay muted. No colored bar, no dot.
- On wide screens it sits in a narrow column beside the text and sticks to the top while the text scrolls. On phones it moves above the text, or into a disclosure, and does not stick.
- Links are plain anchors to the heading ids, so they work without script and the browser keeps scroll and focus. A scroll spy only updates the current mark.
- Registry `PageToc` takes `items` (`id`, `label`, `level`) and an `offset` for a sticky header.

## Do

- Use the same words as the headings, so the list and the text match.
- Give headings `scroll-margin-top` equal to any sticky header, so a jump does not hide the heading.
- Mark the current section by tone and weight, so it still reads in grayscale.
- Keep each link 44px tall on touch screens.

## Don't

- Don't mark the current item with a thick colored left border (AC-10).
- Don't set the "ON THIS PAGE" heading in spaced capitals (AC-01).
- Don't animate the page scroll with a long custom easing; respect reduced motion and the browser default.
- Don't number the items unless the headings carry the same numbers.

## Swap recipe

Slop version (fixes AC-10, AC-01):

```tsx
<nav>
  <p className="uppercase tracking-[0.2em] text-xs text-violet-400">On this page</p>
  {items.map((i) => <a className={i.id === active ? 'border-l-4 border-violet-500 pl-3 text-violet-300' : 'pl-4'}>{i.label}</a>)}
</nav>
```

Fixed version:

```tsx
import { PageToc } from './blocks/page-toc'

<aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
  <PageToc items={[{ id: 'start', label: 'Before you start' }, { id: 'columns', label: 'Match the columns', level: 2 }]} offset={56} />
</aside>
```

## Tokens

- Rail: `--border`, 1px. Ink: `--text` for the current section, `--text-muted` for the others, `--text-subtle` for the list heading.
- Type: `--t-body` for links, `--t-sm` for the heading, `--w-med` for the current link.
- Space: `--sp-4` left padding, `--sp-8` for level 2 items, `--sp-1` between links.
- Motion: color at `--dur-press`; no scroll animation of its own.
