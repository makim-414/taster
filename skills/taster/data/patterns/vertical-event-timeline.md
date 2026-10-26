---
id: vertical-event-timeline
name: Vertical event timeline
category: timeline-stepper
uses: [show-when-things-happen]
surfaces: [app, editorial]
replaces: []
components: []
inspiration: []
status: stable
---

## When to use

Dated entries that read top to bottom: a change log, a roadmap by quarter, a review history, a project history on an about page. The order is the content. If there are fewer than three entries, write a sentence. If entries have no real dates, use a plain list.

## Anatomy

- Left column: the date or period, right-aligned or fixed width, in `--text-subtle` with tabular numerals.
- A 1px spine in `--border` runs the full height. Each entry has a small node on the spine: a 7px dot, filled for the latest entry, a ring for the rest.
- Right column: a title in `--text`, one to two lines of body in `--text-muted`, and optional links.
- Newest first for logs and histories, oldest first for roadmaps and stories. Pick one and say it in the heading.
- Group by month or quarter with a quiet sticky label when entries pass about 12.
- On phones the date moves above the title and the spine stays at the left edge.

## Do

- Use real, machine-readable dates: `<time datetime="2026-09-14">`.
- Keep each entry to what changed and why it matters. Link to the long version.
- Make the spine continuous; entries hang off it instead of floating in cards.
- Mark the current period or the latest release with a filled node, nothing louder.
- Let the list scroll with the page. A horizontal timeline with scroll hijacking breaks the back button.

## Don't

- Don't wrap each entry in its own bordered card. The spine already groups them.
- Don't alternate left and right. It costs width and reading order.
- Don't give each entry a different colored icon or tint.
- Don't animate entries in on scroll with long delays; the page feels slower than it is.
- Don't number entries 01, 02, 03 when dates already order them.

## Swap recipe

No catalog rule covers this yet, but the common slop version is a row of colored cards with icon circles. This is the fix.

```tsx
// before: card per entry, tinted icon circle, alternating sides
<div className="grid grid-cols-2">
  <div className="rounded-2xl border p-6 shadow-lg">
    <span className="grid size-10 place-items-center rounded-full bg-indigo-500/15 text-indigo-300">*</span>
    <h3>Beta launch</h3>
  </div>
</div>

// after
type Entry = { date: string; iso: string; title: string; body?: string }

function Timeline({ entries }: { entries: Entry[] }) {
  return (
    <ol className="relative ml-24 border-l border-border pl-6">
      {entries.map((e, i) => (
        <li key={e.iso} className="relative pb-8 last:pb-0">
          <span aria-hidden className={
            'absolute -left-[28px] top-1.5 size-[7px] rounded-full ' +
            (i === 0 ? 'bg-text' : 'border border-text-subtle bg-bg')
          } />
          <time dateTime={e.iso} className="absolute -left-24 w-16 -translate-x-2 text-right text-xs tabular-nums text-text-subtle">
            {e.date}
          </time>
          <h3 className="text-title font-medium text-text">{e.title}</h3>
          {e.body && <p className="mt-1 text-sm text-text-muted">{e.body}</p>}
        </li>
      ))}
    </ol>
  )
}
```

## Tokens

- `--border`: the spine.
- `--text`, `--text-muted`, `--text-subtle`: title, body, date.
- `--bg`: fill of the ring nodes so the spine does not show through.
- `--t-title`, `--t-body`, `--t-sm`: entry type scale.
- `--sp-6`, `--sp-8`: gutter between spine and text, and gap between entries.
