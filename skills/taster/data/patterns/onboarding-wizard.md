---
id: onboarding-wizard
name: Onboarding wizard
category: timeline-stepper
uses: [guide-through-steps, capture-contact]
surfaces: [auth-onboarding]
replaces: []
components: [blocks/input, blocks/button]
inspiration: []
status: stable
---

## When to use

A first-run flow where the product cannot be useful until it knows 3 to 6 things: a name, a workspace, a data source, a goal. Use one question per screen so each answer is easy and the back button is cheap. If you can learn the same thing later from behavior, skip the wizard and ask in context.

## Anatomy

- Top: a segmented progress bar or "Step 2 of 4" text. See stage-dot-progress for the marks.
- Body: one heading that is the question, one line of help, one input group. Max width about 440px, centered on desktop, full width on phones.
- Footer: Back (ghost or text) on the left, Continue (solid) on the right. Continue is disabled until the answer is valid, with the reason shown under the field, not in a tooltip.
- Skip: a text link, visible only when the step is truly optional.
- Final screen: a summary of what was set and one primary button to enter the product.
- Optional tour: a spotlight that dims the page except one region, with a caption, a Next button and a count. It plays once and can be replayed from help.

## Do

- Save each step as soon as it is answered. Closing the tab should not cost the user their work.
- Put focus in the first field on each step and let Enter continue.
- Show a progress count that cannot change. If steps depend on answers, say "About 4 steps".
- Ask for the least sensitive thing first, and say why you need each answer.
- Make the last step show real output from the answers (a first report, a first page), not a congratulations screen.

## Don't

- Don't open with a carousel of feature screenshots. People came to do something.
- Don't use a confetti burst, a trophy or a colored check circle at the end.
- Don't hide the Back button on step 2 and later.
- Don't put a marketing sign-up form inside the wizard. Collect only what the next screen needs.
- Don't force the tour. If someone presses Escape, end it and do not ask twice.

## Swap recipe

No catalog rule covers this yet. The usual slop is a stack of steps on one long page with colored icons and a gradient Finish button.

```tsx
// before
<form className="space-y-6">
  <Step icon="rocket" color="from-violet-500 to-pink-500" title="Welcome!" />
  <Step icon="zap" color="from-sky-500 to-indigo-500" title="Connect your tools" />
  <button className="bg-gradient-to-r from-violet-500 to-pink-500 shadow-xl">Finish</button>
</form>

// after
import { Input } from './blocks/input'
import { Button } from './blocks/button'
import { Progress } from './blocks/progress'

function WorkspaceStep({ value, onChange, onBack, onNext }) {
  const valid = value.trim().length >= 2
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (valid) onNext() }} className="mx-auto w-full max-w-[440px]">
      <Progress value={50} label="Step 2 of 4" />
      <h1 className="mt-6 text-h2 font-semibold">What should we call your workspace?</h1>
      <p className="mt-2 text-sm text-text-muted">Teammates see this name when you invite them.</p>
      <Input autoFocus className="mt-4" value={value} onChange={(e) => onChange(e.target.value)} />
      <div className="mt-6 flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={!valid}>Continue</Button>
      </div>
    </form>
  )
}
```

## Tokens

- `--t-h2`, `--t-body`, `--w-semi`: question and help text.
- `--accent`, `--bg-elev`: progress fill and track.
- `--input`, `--ring`: field border and focus ring.
- `--scrim`: dim layer for the spotlight tour.
- `--sp-4`, `--sp-6`: gaps between heading, field and footer.
- `--dur-modal`, `--ease-out`: step transition, under 300ms in practice.
