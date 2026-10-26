---
id: dialog
name: Dialog and sheet
category: modal-drawer
uses: [show-details-on-demand]
surfaces: [app, landing, dashboard]
replaces: [CMP-04, CMP-05]
components: [blocks/dialog]
inspiration: [https://ui.shadcn.com/docs/components/dialog, https://www.radix-ui.com/primitives/docs/components/dialog]
status: stable
---

## When to use

When a task needs the person's full attention and the page behind it should wait: editing a record, confirming a short choice, viewing media at full size. Use a centered dialog for short forms and decisions, a sheet from the right edge for row details that people compare against the list, and a lightbox for images and video.

Do not use a dialog for content people want to keep open while they work elsewhere on the page. That belongs in a panel. Do not open a dialog on page load.

## Anatomy

- Backdrop: `--scrim` (black at about 55 to 60%), covering the viewport. Blur on the backdrop is allowed here because two layers really overlap.
- Panel: `--popover` fill, 1px `--border`, `--r-xl` radius, `--sh-pop`. Max width 448px for dialogs, 480 to 560px for sheets, padding 24px.
- Header: title at 16px semibold, one muted description line. Close button: a 16px line icon, top right, 32px hit area, visible focus ring.
- Body: the content, with at most one scroll area (the body, not the panel and the page).
- Footer: actions right-aligned, secondary left of primary. One primary button.
- Registry: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`, built on Radix, which handles focus trap, Escape, scroll lock and `aria-modal`.

## Do

- Always render `DialogTitle` (it can be visually hidden). Screen readers announce it on open.
- Move focus to the first field or the primary action on open, and restore it to the trigger on close.
- Close on Escape, scrim click and the close button, unless there are unsaved changes, then ask.
- Animate in with `opacity` and a small scale from `--enter-scale` (0.95), never from 0. Keep it under 300ms, exits faster than entries.
- On phones, turn the dialog into a bottom sheet with a top radius and full width.

## Don't

- Don't stack dialogs on dialogs. If you need a second decision, replace the content of the first.
- Don't put a gradient header, an illustration or a colored icon circle at the top of a plain dialog.
- Don't use a giant radius (28px) and a long soft shadow on every panel in the product. Radius follows element size and only floating things get shadows.
- Don't scroll the page behind the dialog.
- Don't hide the close button in a corner at 40% opacity.

## Swap recipe

Slop version (fixes CMP-04, CMP-05):

```css
.modal {
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(40px);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
}
.card, .tile, .input { border-radius: 28px; box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5); }
```

Fixed version:

```tsx
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from './blocks/dialog'
import { Button } from './blocks/button'

<Dialog>
  <DialogTrigger asChild><Button variant="outline">Rename project</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Rename project</DialogTitle>
      <DialogDescription>The name appears in the sidebar and in shared links.</DialogDescription>
    </DialogHeader>
    <input className="h-9 rounded-md border border-border-input bg-transparent px-3 text-sm" defaultValue="Spring catalog" />
    <DialogFooter>
      <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Only the layer that floats gets `--sh-pop`. Cards and inputs inside the page keep `--r-card` or `--r-md` and no shadow.

## Tokens

- Surfaces: `--popover` panel, `--scrim` backdrop, `--border` edge, `--input` for fields inside.
- Shadow: `--sh-pop`. Radius: `--r-xl` panel, `--r-md` fields and buttons.
- Type: `--t-title` (16px) title, `--t-body` body, `--lh-normal`.
- Space: panel padding `--sp-6`, gap `--sp-4`, footer gap `--sp-2`.
- Motion: `--dur-modal` with `--ease-drawer` for sheets, `--dur-dropdown` with `--ease-out` for centered dialogs, `--enter-scale` as the start scale.
