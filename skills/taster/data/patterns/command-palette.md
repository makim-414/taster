---
id: command-palette
name: Command palette
category: command-palette
uses: [jump-anywhere, explain-on-demand]
surfaces: [app, dashboard]
replaces: []
components: [blocks/command-palette, blocks/shortcuts-cheatsheet, blocks/use-hotkeys]
inspiration: [https://cmdk.paco.me]
status: stable
---

## When to use

Products with enough pages and actions that people forget where things live: dashboards, admin consoles, editors. A palette lets a returning user jump anywhere and run common actions without touching the mouse. It is an accelerator, not the only way to navigate.

Skip it on sites with ten pages or fewer, and on any surface where the audience never uses a keyboard shortcut.

## Anatomy

- Trigger: a shortcut (mod+k) and a visible hint in the top bar ("Search  Cmd K") so it can be discovered.
- Panel: centered at about 12vh from the top, 620px wide, `--bg-elev` with a 1px border and `--sh-pop`, over `--scrim`.
- Input: 48px tall, no inner border, bottom rule only, placeholder "Search commands".
- Results: grouped by kind (Pages, Actions, Recent). Each row has a small bordered kind tag, the label and an optional hint (shortcut or path). Highlighted row uses a surface step.
- Footer hints optional: arrows to move, enter to run, esc to close.
- Registry: `CommandPalette` takes `items: CommandItem[]` (`id`, `kind`, `label`, `hint`, `run`), `onClose` and `placeholder`. `useHotkeys` binds shortcuts, `useFocusTrap` keeps focus inside and `useListNavigation` handles arrow movement. `ShortcutsCheatsheet` (`groups: ShortcutGroup[]`, `onClose`) is the companion help sheet opened with `?`.

## Do

- Filter on label, kind and hint together, case-insensitive, and reset the highlight to the first row on each keystroke. Rank labels that start with the query first.
- Accept Hangul initials for Korean labels: "ㄹㅇㅂㄹ" finds "라이브러리". Korean users type initials out of habit, and it costs ten lines (`matchCommands` in the registry block).
- Run the highlighted command on Enter, close on Escape, and return focus to whatever opened the palette.
- Show "No results" as plain muted text, with a suggestion if one exists.
- List shortcuts by area in the cheat sheet (Navigation, Editing, View), two columns on wide screens, `kbd` elements with a 1px border.
- Register the shortcut with `useHotkeys` and ignore it while a text field has focus unless it uses a modifier.

## Don't

- Don't make it the only route to a feature. Every command needs a visible control somewhere.
- Don't ship a palette with five items. It makes the product feel emptier.
- Don't use a glowing gradient border or animated sparkle on the input.
- Don't trap people without an exit: Escape and a click on the scrim must always close it.
- Don't invent shortcuts that clash with the browser (Cmd T, Cmd W, Cmd L).

## Swap recipe

Slop version (no rule ids in replaces; the failure is behavioral): a modal that is a fake search box, mouse only, no focus trap.

```tsx
<div className="modal">
  <input placeholder="Search..." />
  <ul>{items.map((i) => <li onClick={i.run}>{i.label}</li>)}</ul>
</div>
```

Fixed version:

```tsx
import { CommandPalette, type CommandItem } from './blocks/command-palette'
import { ShortcutsCheatsheet } from './blocks/shortcuts-cheatsheet'
import { useHotkeys } from './blocks/use-hotkeys'

function Chrome() {
  const [open, setOpen] = React.useState(false)
  const [help, setHelp] = React.useState(false)
  useHotkeys({
    'mod+k': (e) => { e.preventDefault(); setOpen(true) },
    '?': () => setHelp(true),
  })
  const items: CommandItem[] = [
    { id: 'orders', kind: 'Page', label: 'Orders', hint: 'g o', run: () => { go('/orders'); setOpen(false) } },
    { id: 'new', kind: 'Action', label: 'Create invoice', run: () => { create(); setOpen(false) } },
  ]
  return (
    <>
      {open && <CommandPalette items={items} onClose={() => setOpen(false)} />}
      {help && (
        <ShortcutsCheatsheet
          onClose={() => setHelp(false)}
          groups={[{ title: 'Navigation', rows: [{ keys: ['Cmd', 'K'], label: 'Open palette' }] }]}
        />
      )}
    </>
  )
}
```

## Tokens

- Surfaces: `--bg-elev` panel, `--bg` for the highlighted row, `--scrim` behind, `--border` on the panel and the kind tags.
- Shadow: `--sh-pop`. Radius: `--r-card` on the panel, `--r-sm` on key caps.
- Ink: `--text` labels, `--text-subtle` hints and placeholder.
- Type: `--t-title` (16px) in the input, `--t-body` for rows, `--t-sm` for key caps and group titles.
- Space: row padding `--sp-2` by `--sp-4`, panel top offset 12vh.
- Motion: `--dur-dropdown` with `--ease-out` and `--enter-scale` on open; none on highlight changes.
