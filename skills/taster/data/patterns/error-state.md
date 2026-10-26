---
id: error-state
name: Error and locked state
category: empty-state
uses: [handle-no-data, notify-the-user]
surfaces: [app]
replaces: []
components: [blocks/alert, blocks/button]
inspiration: []
status: stable
---

## When to use

When something that should have shown could not: a request failed, the person lacks permission, a feature is locked to a plan, or a page does not exist. Each case gets plain words about what happened, why if known, and the one thing to do next.

Use it at the smallest scope that failed. A single card that cannot load shows the error inside the card; the rest of the page keeps working.

## Anatomy

- Title: what failed in plain words. "Could not load orders." "You do not have access to billing." "Reports are on the Team plan."
- Reason line: why, when it is known and useful. "The connection timed out." "Ask an admin to add you." Omit if it would only repeat the title.
- Action: a button that does the next thing. Retry for failures, "Request access" for permission, "See plans" for locked features, "Go home" for 404.
- Optional detail: a collapsed technical line (request id, status code) in subtle mono text for support.
- Surface: a neutral card or inline block with a 1px border. The registry `Alert` with `tone="danger"` fits inline failures, and `Button` provides the action.
- Locked-feature variant: no padlock in a gradient circle. A line icon is fine, then the sentence and the request or upgrade button.

## Do

- Say what the person can still do. "Your other data is safe" is worth a line when a write failed.
- Preserve input. A failed save keeps the form filled, with a retry.
- Keep the same layout for the three cases so people learn the pattern.
- Use `role="alert"` for failures that appear after an action, and move focus to the message for page-level errors.
- Log the technical detail but show the person a version they can act on.

## Don't

- Don't write "Something went wrong" with no next step. Name the thing.
- Don't blame the person: "You entered invalid data."
- Don't use a blue to purple gradient circle with a lock for permission screens.
- Don't replace the whole page with an error when only one panel failed.
- Don't autoplay shaking animations or red flashes.

## Swap recipe

Slop version (no rule ids in replaces; visual traits related to AC-11 and COL-01):

```tsx
<div className="rounded-3xl bg-gradient-to-br from-indigo-900 to-purple-900 p-10 text-center">
  <div className="mx-auto grid size-16 place-items-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
    <LockIcon />
  </div>
  <h2>Oops, something went wrong!</h2>
  <p>Please try again later.</p>
</div>
```

Fixed version:

```tsx
import { Alert } from './blocks/alert'
import { Button } from './blocks/button'

// failure inside a card
<Alert tone="danger" title="Could not load orders">
  The connection timed out. Your other data is safe.
  <div className="mt-3"><Button size="sm" variant="outline" onClick={retry}>Retry</Button></div>
</Alert>

// locked feature
<div className="rounded-lg border border-border bg-bg-elev p-6">
  <h2 className="text-base font-semibold">Reports are on the Team plan</h2>
  <p className="mt-1 text-sm text-text-muted">Your workspace is on Free. Ask an admin to upgrade, or request access to a shared report.</p>
  <div className="mt-4 flex gap-2">
    <Button size="sm">Request access</Button>
    <Button size="sm" variant="ghost">See plans</Button>
  </div>
</div>
```

## Tokens

- Surface: `--bg-elev` with `--border`. No gradient, no tint.
- Color: `--danger` on the alert icon only. Locked features use no semantic color at all.
- Ink: `--text` title, `--text-muted` reason, `--text-subtle` technical detail in `--font-mono`.
- Type: `--t-title` (16px) title, `--t-body` reason, `--t-sm` detail.
- Space: padding `--sp-6`, gap `--sp-1` title to reason, `--sp-4` to actions.
- Radius: `--r-card`. Motion: none beyond focus ring transitions.
