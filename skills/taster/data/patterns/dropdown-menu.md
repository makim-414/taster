---
id: dropdown-menu
name: Dropdown menu
category: modal-drawer
uses: [start-an-action, navigate-the-app]
surfaces: [app]
replaces: []
components: [blocks/dropdown]
inspiration: [https://www.radix-ui.com/primitives/docs/components/dropdown-menu]
status: stable
---

## When to use

A short list of actions behind one button: row actions behind a three-dot trigger, an account menu, a "New" button that creates several kinds of things, a sort or view option set. Use it when showing every action would clutter the row or the bar.

Do not use a dropdown for navigation between pages of a site (use links or a mega menu), for choosing a value in a form (use a select or combobox) or for a single action (use a button).

## Anatomy

- Trigger: a button with a visible label or an `aria-label` for icon-only triggers, with `aria-haspopup="menu"`.
- Panel: `--popover` fill, 1px `--border`, `--r-lg` about 8px radius, 4px padding, `--sh-pop`, minimum width 160px, aligned to the trigger edge and offset 6px.
- Items: 36px tall, 14px text in muted ink, hover or keyboard focus lifts to `--bg-elev` with full ink. Leading 16px line icon optional and consistent: either every item has one or none do.
- Checked items: a check mark at the left or right for multi-select options (view columns), radio dot for single choice (sort order).
- Separators: 1px `--border`, with a destructive item last and set apart.
- Labels: group captions at 11px in subtle ink, sentence case.
- Registry: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent` (`sideOffset`), `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, on Radix for typeahead, arrow keys and focus return.

## Do

- Put the most common action first and the destructive one last, after a separator.
- Keep item text to one to three words, verb first: "Rename", "Duplicate", "Move to trash".
- Show the keyboard shortcut at the right in subtle ink when one exists.
- Use `onSelect` handlers and let the menu close itself; do not keep it open after an action unless it is a checkable option.
- Make the trigger at least 32px square and give it a visible pressed state while the menu is open.

## Don't

- Don't nest submenus more than one level. If you need two, you need a page.
- Don't give each item a differently tinted icon tile.
- Don't open on hover. Hover menus close under the pointer and fail on touch.
- Don't style the destructive item red on red. A red label is enough.
- Don't pile 15 items into a menu. Group them or use a command palette.

## Swap recipe

Slop version (no rule ids in replaces; this is the stock generated look, related to CMP-04, CMP-05 and COL-06):

```tsx
<div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/10 backdrop-blur-xl shadow-2xl p-2">
  <button className="flex w-full gap-3 rounded-xl p-3 hover:bg-gradient-to-r from-indigo-500/20 to-purple-500/20">
    <span className="rounded-lg bg-indigo-500/20 p-2"><PencilIcon /></span> Rename
  </button>
</div>
```

Fixed version:

```tsx
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from './blocks/dropdown'

<DropdownMenu>
  <DropdownMenuTrigger aria-label="Row actions" className="rounded-md p-1.5 text-text-muted hover:text-text">
    <MoreIcon width={16} height={16} />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Project</DropdownMenuLabel>
    <DropdownMenuItem onSelect={rename}>Rename</DropdownMenuItem>
    <DropdownMenuItem onSelect={duplicate}>Duplicate</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={trash} className="text-danger focus:text-danger">Move to trash</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Tokens

- Surfaces: `--popover` panel, `--bg-elev` for the focused item, `--border` for the edge and separators.
- Shadow: `--sh-pop`. Radius: `--r-md` panel, `--r-sm` items.
- Ink: `--text-muted` rest, `--text` focused, `--text-subtle` labels and shortcuts, `--danger` for the destructive label only.
- Type: `--t-body` (14px) items, `--t-xs` (11px) group labels.
- Space: panel padding `--sp-1`, item padding `--sp-2` by `--sp-3`.
- Motion: `--dur-dropdown` (200ms) with `--ease-out`, `--enter-scale` and `--enter-offset`.
