---
id: step-workflow-section
name: Step workflow section
category: timeline-stepper
uses: [guide-through-steps, explain-features]
surfaces: [landing]
replaces: [AC-04, COL-07, LAY-03]
components: [marketing/workflow-section, blocks/tabs, blocks/accordion, marketing/step-showcase]
inspiration: []
status: stable
---

## When to use

A landing section that explains a process with 3 to 6 stages, where each stage has a short body: a list, a small chart, a few numbers. Use it when the stages are different from each other and the reader should be able to jump to the one they care about. If the stages are one idea repeated, use a plain list and skip the interaction.

## Anatomy

- Section head: one sentence heading (sentence case), one supporting sentence. No small caps eyebrow with tracking.
- Step rail: tabs on desktop (`blocks/tabs`, segmented, active tab separated by lightness), a vertical accordion on phones (`blocks/accordion`).
- Step card: heading, one-line goal, a body in neutral tones. The body is real content or a faithful sample, not an icon grid.
- Optional assistant dock below the card that is always visible: title, a few messages, an input. It answers questions about the step on view.
- Backdrop: a single low-contrast radial per tab. No colored glow, no animated blobs.
- Step numbers appear only when the order is a rule ("Step 2 of 5"), and then as plain text.

## Do

- Name stages by what happens to the customer's work ("Find candidates", "Review automatically"), not by internal jargon.
- Keep the card height constant between tabs, so the page does not jump when someone clicks.
- Let the keyboard move through the rail with arrow keys; `role="tablist"` is built in.
- Render the body of the first tab on the server, so the section is useful without script.
- Show a status label in the card ("Scanning", "Auto-checked") as plain text next to the heading.

## Don't

- Don't put 01, 02, 03 in front of every stage when the order does not matter.
- Don't use a tinted pill with a dot for the status of a stage.
- Don't give the active card a colored drop shadow or a purple halo.
- Don't fill the body with stock icons in circles. Show the thing, or cut the stage.
- Don't let the assistant dock cover content on a phone; collapse it to a single row.

## Swap recipe

Slop: numbered feature cards, tinted status pills, glow shadow on the active card. Fixes LAY-03 (section numbers), AC-04 (tinted pill) and COL-07 (colored glow).

```css
/* before */
.step::before { content: "01"; letter-spacing: 0.25em; color: #818cf8; }
.step .status {
  border-radius: 999px; padding: 2px 10px;
  background: rgba(99, 102, 241, 0.15); color: #a5b4fc;
}
.step.is-active { box-shadow: 0 0 48px rgba(99, 102, 241, 0.5); }
```

```tsx
// after
import { WorkflowSection } from './marketing/workflow-section'

<WorkflowSection
  heading="From first search to published report"
  body="Five stages, each one reviewable before the next starts."
  tabs={tabs}   // [{ key, label, heading, badge, goal, icon, body, glow }]
  agent={{ title: 'Ask about this step', online: 'Online', msgs, input: 'Type a question' }}
/>
/* status is plain text:  <span class="text-xs text-text-muted">Scanning</span>
   active card:           border 1px var(--border), shadow none */
```

On narrow screens render the same `tabs` array into `Accordion` / `AccordionItem` so there is one data source.

## Tokens

- `--bg`, `--bg-elev`, `--border`: backdrop, step card and its edge.
- `--text`, `--text-muted`, `--text-subtle`: heading, goal, status text.
- `--chart-2` to `--chart-4`: bars inside a step body, lightness only.
- `--r-card`, `--r-xl`: card and rail corners.
- `--dur-dropdown`, `--ease-out`: tab content swap, under 200ms.
- `--sp-6`, `--sp-8`, `--sp-12`: section padding and gap between rail and card.
