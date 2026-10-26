---
id: confirm-destructive-dialog
name: Confirm destructive dialog
category: modal-drawer
uses: [confirm-an-action]
surfaces: [app]
replaces: [CPY-01]
components: [blocks/dialog, blocks/alert]
inspiration: [https://www.radix-ui.com/primitives/docs/components/alert-dialog]
status: stable
---

## When to use

Before an action that removes or overwrites something: delete a project, remove a member, reset data, revoke a key. The dialog exists to make the cost visible, not to slow people down. If the action can be undone with a toast and an Undo button, use that instead and skip the dialog.

Use the typed-name variant only for irreversible actions that affect many things (a workspace, a brand, a production database).

## Anatomy

- Title that names the action and the object: "Delete Spring catalog?" Not "Are you sure?"
- One sentence on what disappears and what stays: "This removes 14 products and their photos. Orders and customers are kept."
- One line on reversibility: "You can restore it for 30 days" or "This cannot be undone."
- For irreversible actions: an input that asks the name to be typed, and a destructive button that stays disabled until it matches exactly.
- Footer: Cancel (ghost, default focus) and the destructive action (`variant="destructive"`), labeled with the verb ("Delete project"), not "Confirm" or "OK".
- A blocked mode: when the action cannot proceed (the project has an active subscription), the dialog states why and offers only Close.
- Built from the registry `Dialog` parts, an `Alert` for the consequence line and `Button` with `variant="destructive"`.

## Do

- Put initial focus on Cancel, or on the name field when one exists. Never on the destructive button.
- Use the real object name and real counts. Generated copy that says "this item" tells nothing.
- Say what stays, not only what goes. People fear collateral damage more than the delete itself.
- Keep the destructive color on the button only. The dialog frame stays neutral.
- Return focus to the row or the trigger after close, and announce the result with a toast.

## Don't

- Don't write "Are you sure?" with a red triangle icon and a paragraph of boilerplate.
- Don't label the buttons Yes and No. People hit the wrong one when the question is a sentence away.
- Don't fill the whole dialog with a red tint.
- Don't ask twice. One confirmation per action.
- Don't require typing the name for reversible actions. It trains people to paste without reading.

## Swap recipe

Slop version (fixes CPY-01):

```tsx
<Modal>
  <AlertTriangleIcon className="text-red-500 size-12" />
  <h2>Are you sure?</h2>
  <p>This action cannot be undone. This will permanently delete your data and remove it from our servers.</p>
  <button>No</button><button className="bg-red-500">Yes</button>
</Modal>
```

Fixed version:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './blocks/dialog'
import { Alert } from './blocks/alert'
import { Button } from './blocks/button'

function ConfirmDelete({ name, products, open, onOpenChange, onConfirm }: Props) {
  const [typed, setTyped] = React.useState('')
  const ok = typed === name
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            This removes {products} products and their photos. Orders and customers are kept.
          </DialogDescription>
        </DialogHeader>
        <Alert tone="danger" title="This cannot be undone">
          Type <span className="font-medium text-text">{name}</span> to continue.
        </Alert>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          aria-label="Project name"
          className="h-9 rounded-md border border-border-input bg-transparent px-3 text-sm"
        />
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button variant="destructive" disabled={!ok} onClick={onConfirm}>Delete project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Good copy is a fact: counts, names, what remains. Replace stock phrases with those.

## Tokens

- Surfaces: `--popover` panel, `--scrim` backdrop, neutral `--bg-elev` and `--border` for the consequence callout.
- Color: `--danger` only on the destructive button and the small alert icon.
- Type: `--t-title` (16px) title, `--t-body` description, name in `--w-med`.
- Space: panel padding `--sp-6`, gap `--sp-4`, footer gap `--sp-2`.
- Radius: `--r-xl` panel, `--r-md` input and buttons. Motion: `--dur-dropdown` with `--ease-out`.
