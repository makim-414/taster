---
id: readable-at-every-width
name: Readable at every width
category: layout-shell
uses: [organize-the-page, read-long-text]
surfaces: [landing, dashboard, app, commerce, editorial, auth-onboarding, ai-chat]
replaces: [RSP-01, RSP-02, RSP-03, RSP-04, RSP-05]
components: []
inspiration: []
status: stable
---

## When to use

Every screen, before it ships. Generated layouts are usually checked at one phone width and one desktop width, and they break in between: a sidebar takes 280px out of a 768px tablet, a four column grid keeps four columns, and a card name ends up one letter wide. This pattern is the set of layout habits that keep text readable from 360px to 1440px, and the widths to check it at.

## Anatomy

- Nine widths: 360, 390, 640, 767, 768, 820, 1024, 1280, 1440. The pair 767 and 768 catches the jump at the md breakpoint; 820 is a portrait tablet; 1024 is a landscape tablet held in the hand.
- The content box, not the window, decides the columns. A grid inside a page with a 280px sidebar has 488px at a 768px window. Use container queries (`@container`) or count columns from the space the grid actually gets.
- Flex and grid children can shrink: `min-width: 0` on children that hold text, `max-width: 100%` on media.
- Names wrap between words instead of being cut: `overflow-wrap: anywhere` everywhere, plus `word-break: keep-all` for Korean.
- Labels sit above values when the row gets narrow, instead of squeezing the value column.
- Wide data has a planned narrow form: a table becomes stacked rows, a chip row scrolls on purpose and says so.

## Do

- Run the check at all nine widths (`node engine/cli.mjs <url> --widths responsive`) and open the 768, 820 and 1024 captures yourself. Zero findings is the floor, not the proof.
- Truncate only long titles, keep the first words visible, and show the full text on hover or focus.
- Mark a row that scrolls sideways on purpose with `data-taster-allow="scroll"` and let the last visible item be cut so readers see that more follows.
- Measure Korean on a machine whose fallback font is as wide as the CI font. Hangul is about 0.87em wide in macOS fonts and 1em in many Linux fonts, so a name that fits on a Mac can be cut in CI.
- Give buttons room for their longest translated label, or let the label wrap to two lines.

## Don't

- Don't key layout on the window width when the component sits next to a sidebar.
- Don't fix a sideways scroll with `overflow-x: hidden` on body. It hides the broken element and cuts its content.
- Don't put an ellipsis on a short name or a button label. If eight characters do not fit, the box is wrong.
- Don't stack text in absolute positioned layers that collide when the column narrows.
- Don't shrink a column until text runs one letter per line; drop to one column earlier.

## Swap recipe

Slop: a fixed four column card grid beside a sidebar, names cut with an ellipsis, a table that pushes the page sideways. Fixes RSP-01, RSP-02, RSP-03 and RSP-05.

```tsx
// before
<main className="ml-[280px]">
  <div className="grid grid-cols-4 gap-6">
    {items.map((i) => <Card key={i.id}><h3 className="truncate w-24">{i.name}</h3></Card>)}
  </div>
  <table className="w-[960px]">...</table>
</main>

// after
<main className="min-w-0 @container">
  <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-4">
    {items.map((i) => (
      <Card key={i.id}>
        <h3 className="[overflow-wrap:anywhere] [word-break:keep-all]">{i.name}</h3>
      </Card>
    ))}
  </div>
  {/* the narrow form is planned: stacked rows under @2xl, a real table above */}
  <ul className="@2xl:hidden">...</ul>
  <table className="hidden w-full @2xl:table">...</table>
</main>
```

## Tokens

- `--sp-4`, `--sp-6`: gaps that stay the same while columns change.
- `--t-body`, `--lh-normal`: text keeps its size at every width; the layout moves, not the type.
- `--control-touch`: 44px controls at the widths where the layout is touch first (see flat-solid-button).
