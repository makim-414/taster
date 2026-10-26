---
id: ask-human-step
name: Ask-human step
category: chat-ai
uses: [confirm-an-action, ask-the-assistant]
surfaces: [ai-chat]
replaces: []
components: [blocks/button]
inspiration: []
status: stable
---

## When to use

Use it when the agent must stop and get a decision before it continues: pick between options it cannot rank, supply a missing fact, approve an action that changes something, or review a list of proposed items. The point is a clean handoff of control. The agent is paused, the person sees exactly what it needs, answers, and it resumes.

Do not use it for questions the agent could answer by looking. Do not ask for approval of read-only steps. Too many stops teach people to click through.

## Anatomy

Two shapes.

Ask card: one question at a time inside a bordered card in the thread. Question text on top. Below it, two to five option buttons, each with a label and an optional one-line consequence. A free-text field labeled "Something else" is always last. When there are several questions, a pager shows "2 of 4" with a small step mark per question and arrow buttons. The last question's primary button reads "Send answers".

Review queue: a collapsed line "Review 12 items" that opens into a panel. Each row shows the proposed item and two icon-labeled buttons, Keep and Remove. When a row is decided it collapses to a single line with the choice written out, and the count in the header updates. Nothing is applied until "Apply" is pressed.

In both cases the thread shows a visible paused state: "Waiting for your answer".

## Do

- Put the consequence in the option label: "Send to 240 customers" is better than "Option A".
- Make buttons at least 44px high, the safe default visually primary only when the agent recommends it.
- Move focus to the card when it appears and return it to the composer afterward. Do not steal focus if the person is typing.
- Preserve answers if the person navigates between questions with the pager.
- Offer "Skip" or "Cancel run" so the person is never trapped.
- Record the decision in the thread as a plain line ("You chose: Send to 240 customers") after the card closes.
- Use `role="group"` with `aria-labelledby` on the question text.

## Don't

- Do not build a modal for this. It cuts the person off from the context they need to decide.
- Do not tint the decided rows green and red with a pill (AC-04). Write "Kept" or "Removed" and dim the row.
- Do not use a ghost-style outline for the recommended answer (AC-16).
- Do not auto-pick after a timeout without saying so.
- Do not ask four questions when two could be defaults you show for editing.
- Do not use celebratory animation or confetti when the answer is sent.

## Swap recipe

The slop version fires a toast-style prompt with a ghost primary button and a glowing accent.

```html
<!-- before: ghost primary, side accent border, tinted band -->
<div class="rounded-xl border-l-4 border-amber-400 bg-amber-400/10 p-4">
  <p>Do you want me to continue?</p>
  <div class="flex gap-2">
    <button class="rounded-lg border border-white/30 bg-transparent px-4 py-2">Yes</button>
    <button class="rounded-lg px-4 py-2 text-white/50">No</button>
  </div>
</div>
```

```tsx
// after: a question with named consequences, one solid recommended action, free text, and a pager
import { Button } from './blocks/button'

export function AskCard({ q, index, total, onAnswer }: AskCardProps) {
  const [other, setOther] = React.useState('')
  return (
    <section role="group" aria-labelledby={`q-${q.id}`} className="rounded-[var(--r-card)] border border-[var(--border)] bg-[var(--bg-elev)] p-[var(--sp-5)]">
      <p id={`q-${q.id}`} className="text-[length:var(--t-title)]">{q.text}</p>
      <div className="mt-[var(--sp-4)] flex flex-col gap-[var(--sp-2)]">
        {q.options.map((o) => (
          <Button key={o.id} variant={o.recommended ? 'solid' : 'secondary'} className="h-11 justify-start" onClick={() => onAnswer(o.id)}>
            {o.label}{o.consequence && <span className="ml-2 text-[var(--text-muted)]">{o.consequence}</span>}
          </Button>
        ))}
      </div>
      <label className="mt-[var(--sp-4)] block text-[length:var(--t-sm)] text-[var(--text-muted)]">
        Something else
        <input value={other} onChange={(e) => setOther(e.target.value)} className="mt-[var(--sp-1)] w-full rounded-[var(--r-md)] border border-[var(--border)] bg-transparent px-3 py-2" />
      </label>
      <p className="mt-[var(--sp-3)] text-[length:var(--t-xs)] tabular-nums text-[var(--text-subtle)]">{index + 1} of {total}</p>
    </section>
  )
}
```

The side accent and tinted band are AC-10 and AC-06, the ghost primary AC-16. Use `blocks/button` variants `solid` and `secondary`.

## Tokens

- Card: `--bg-elev`, `--border`, `--r-card`, padding `--sp-5`.
- Options: `blocks/button` `solid` for the recommended answer, `secondary` for the others. Height 44px, gap `--sp-2`.
- Decided row: opacity 0.6 and a text label, not a tint.
- Pager text: `--t-xs`, `tabular-nums`, `--text-subtle`.
- Motion: card enters with `--enter-offset` and `--dur-dropdown` on `--ease-out`; decided rows collapse over `--dur-dropdown`. Press feedback `--press-scale` at `--dur-press`. All collapse to near zero under reduced motion.
