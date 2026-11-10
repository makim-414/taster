---
id: live-step-list
name: Live step list
category: timeline-stepper
uses: [show-progress, guide-through-steps]
surfaces: [app, ai-chat]
replaces: [AC-07]
components: [blocks/progress]
inspiration: []
status: stable
---

## When to use

Work that takes more than a few seconds and has visible phases: an analysis run, a generation job, an agent checking sources. The person waits, so tell them what is happening now, what is done and what is next. Do not use it for a one-step wait; a spinner and a sentence are enough.

## Anatomy

- Vertical list of steps in order. Three states: pending, running, done.
- Pending: label in `--text-subtle`, empty ring. Running: label in `--text` at body size plus one step, a neutral spinner, elapsed time in tabular numerals. Done: label in `--text-muted`, a line check icon, final duration.
- Only the running step is expanded. If it checks several sources, show one small card per source with its own state.
- A thin rail on the left connects the marks. It is a hairline, 1px `--border`.
- Footer line: total elapsed time, and a cancel action when canceling is safe.
- The list is `aria-live="polite"`, so a screen reader hears each state change once.

## Do

- Write steps in the present tense of the work: "Reading 12 pages", "Comparing prices".
- Show elapsed time in `mm:ss` with `font-variant-numeric: tabular-nums` so digits do not jitter.
- Keep finished steps visible. People trust a run they can scroll back through.
- If a step fails, say which one and what was kept; offer retry on that step only.
- Stop all motion when the run ends or the tab is hidden.

## Don't

- Don't render the running state as an orange pill with a glow. It reads as a warning.
- Don't animate the finished steps. Motion belongs to the one thing still happening.
- Don't show a fake percent bar that moves on a timer. If you do not know progress, show steps.
- Don't hide the list behind a modal with no way to leave; the work can continue in the background.
- Don't use a colored circle with a white check for done. A line check is enough.

## Swap recipe

Slop: orange glowing "Processing" pill, a bar with an invented percent. Fixes AC-07 (orange processing pill with glow).

```css
/* before */
.processing {
  border-radius: 999px; padding: 4px 12px;
  background: rgba(251, 146, 60, 0.15); color: #fb923c;
  box-shadow: 0 0 16px rgba(251, 146, 60, 0.6);
}
```

```tsx
// after
type Step = { id: string; label: string; state: 'pending' | 'running' | 'done'; secs?: number }

function LiveStepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-3" aria-live="polite">
      {steps.map((s) => (
        <li key={s.id} className="flex items-baseline gap-3">
          <span aria-hidden className="w-4 shrink-0">
            {s.state === 'done' && <CheckIcon />}
            {s.state === 'running' && <Spinner />}
            {s.state === 'pending' && <span className="block size-3 rounded-full border border-border" />}
          </span>
          <span className={
            s.state === 'running' ? 'text-title text-text'
            : s.state === 'done' ? 'text-sm text-text-muted' : 'text-sm text-text-subtle'
          }>{s.label}</span>
          {s.secs != null && <span className="ml-auto text-xs tabular-nums text-text-subtle">{s.secs}s</span>}
        </li>
      ))}
    </ol>
  )
}
```

`CheckIcon` is a 14px line check, `Spinner` is `<span className="block size-3.5 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />`. Under `prefers-reduced-motion` swap the spinner for a static ring.

## Tokens

- `--text`, `--text-muted`, `--text-subtle`: running, done, pending.
- `--border`: rail and empty ring.
- `--t-title`, `--t-body`: running step is one size up.
- `--bg-elev`, `--border-soft`: per-source cards inside the running step.
- `--dur-dropdown`, `--ease-out`: expanding the running step.
- `--sp-3`, `--sp-4`: gap between steps and between mark and label.
