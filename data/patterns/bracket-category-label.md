---
id: bracket-category-label
name: Bracket category label
category: badge-label
uses: [label-a-state, browse-records]
surfaces: [dashboard, app]
replaces: [AC-04, AC-05]
components: [blocks/bracket-label]
inspiration: []
status: stable
---

## When to use

A list or a table where each row belongs to a kind and the kind helps people scan: sources by type (press, store, own site), files by origin, leads by channel. The kind is a fact about the row, not a state and not a control. Generated interfaces put it in a pill, often a tinted one, and a pill beside a name reads as a second button. Write the word between square brackets instead: `northwind.example [ Press ]`.

Use status-label when the word is a state that changes (paid, failed, running). Use filter-chip when the word is something people click to narrow the list.

## Anatomy

- The word in caption size, `--text-muted`, sentence case, no border, no fill, no radius.
- An opening and a closing square bracket with a space inside each. Both brackets are `aria-hidden`: a screen reader hears "Press", not "left bracket Press right bracket".
- A no-break space between each bracket and the word, and `white-space: nowrap` on the label, so a bracket never ends a line on its own when the row wraps.
- Unknown kind ("Unsorted") one step fainter (`--text-subtle`), still 4.5:1 against the row surface.
- Placed on the same baseline as the row's name, after it, with a small gap. When the row is narrow the label drops to the next line as a whole.
- Registry: `BracketLabel` (`unknown` for the fainter tone).

## Do

- Show the label on every row. Hover text alone never reaches touch or keyboard users.
- Keep the vocabulary short and fixed: five to eight kinds a person can learn, the same word for the same kind on every screen.
- Put the kind into the row's accessible name or its visible text so it can be searched and filtered.
- Keep one kind per row. If a row needs two, the classification is doing too much; split it into a column.

## Don't

- Don't wrap the kind in a pill, tinted or outlined. It competes with the name and suggests it can be clicked.
- Don't color each kind with its own hue. Kinds are not outcomes; color would make the list a legend to learn.
- Don't use brackets for numbers, counts or states. `[ 3 ]` and `[ Failed ]` read as code, not as a note.
- Don't truncate the word with an ellipsis. If it does not fit, the word is too long.

## Swap recipe

Slop: a tinted pill beside each source name. Fixes AC-04 (tinted pill) and AC-05 (outlined pill).

```tsx
// before
<li className="flex items-center gap-2">
  <span>{site.name}</span>
  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">{site.kind}</span>
</li>

// after
import { BracketLabel } from './blocks/bracket-label'

<li className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
  <span>{site.name}</span>
  {site.kind ? <BracketLabel>{site.kind}</BracketLabel> : <BracketLabel unknown>Unsorted</BracketLabel>}
</li>
```

## Tokens

- `--text-muted` for a known kind, `--text-subtle` for an unknown one (both 4.5:1 on `--bg` and `--bg-elev`).
- `--t-xs` (caption) for the size; on a Korean page it reaches 13px through tokens.css.
- `--sp-2` between the name and the label.
