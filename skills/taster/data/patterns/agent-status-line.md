---
id: agent-status-line
name: Agent status line
category: chat-ai
uses: [show-progress, ask-the-assistant]
surfaces: [ai-chat]
replaces: [AC-07]
components: [blocks/skeleton]
inspiration: [https://21st.dev/@anark17r/components/ai-thiking-orb-and-input]
status: stable
---

## When to use

Use it for the seconds between "sent" and "answer": the agent is working and the person needs to know that it is alive and what it is doing. One quiet line is the whole pattern. It also covers the longer form, a feed of actions for an agent that runs for minutes, and a small orb mark that is animated only beside the latest reply.

Do not use it when the answer arrives in under 400ms. Show nothing. Do not use a progress bar with a percentage you cannot compute.

## Anatomy

Three shapes, pick one by duration:

1. Short wait (under about 10 seconds): a single line of text that describes the current step, "Reading the 3 reports", with a light shimmer moving across the glyphs, or three typing dots if there is nothing specific to say. The line is replaced in place as the step changes.
2. Long run (over about 10 seconds): the same line plus an elapsed time in `tabular-nums`, and a feed above it. In the feed, new actions enter at the bottom and earlier ones fade to lower opacity and stop animating.
3. Presence mark: a small orb or logo, 20 to 28px, that animates only next to the latest agent reply. Older replies show a static image of the same mark.

The line sits where the next reply will appear, so the layout does not shift when the answer starts.

## Do

- Write the line as a present participle with an object: "Comparing two price lists". The reader learns something new each time it changes.
- Update the text at most once per second. Faster reads as flicker.
- Implement the shimmer as a `background-clip: text` gradient between `--text-muted` and `--text`, moving at 1.6 to 2 seconds per pass.
- Give the container `role="status"` and `aria-live="polite"`. Announce step changes, not every tick.
- Keep the Stop control next to the line, always reachable.
- Replace the orb animation with a still frame when `prefers-reduced-motion` is set.
- Remove the line the moment text starts to stream.

## Don't

- Do not show the processing state as an orange pill with a glow (AC-07). Use neutral text and a neutral spinner.
- Do not use a colored pulsing dot beside the text (AC-08).
- Do not animate every old orb in the thread. Only the latest one moves, otherwise ten loops run at once.
- Do not use a rainbow or conic gradient orb with blur halo (COL-01, BG-01).
- Do not show fake steps ("Optimizing neural pathways") that the system is not doing (CPY-01).
- Do not use a progress bar that jumps to 90 percent and waits.

## Swap recipe

The slop version is an orange pill with a glow and a pulsing dot.

```html
<!-- before: orange processing pill with glow, pulsing dot (AC-07, AC-08) -->
<span class="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-orange-300 shadow-[0_0_16px_rgba(251,146,60,.5)]">
  <span class="h-2 w-2 animate-pulse rounded-full bg-orange-400"></span> Processing...
</span>
```

```tsx
// after: neutral text, subtle shimmer, a live region, still under reduced motion
export function AgentStatusLine({ text, elapsedSec }: { text: string; elapsedSec?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-[var(--sp-2)] text-[length:var(--t-body)]">
      <span className="status-shimmer">{text}</span>
      {elapsedSec !== undefined && elapsedSec > 10 && (
        <span className="tabular-nums text-[var(--text-subtle)]">{elapsedSec}s</span>
      )}
    </div>
  )
}
```

```css
.status-shimmer {
  color: transparent;
  background: linear-gradient(90deg, var(--text-muted) 0%, var(--text) 50%, var(--text-muted) 100%) 0 0 / 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  animation: status-sweep 1.8s linear infinite;
}
@keyframes status-sweep { from { background-position: 200% 0 } to { background-position: -200% 0 } }
@media (prefers-reduced-motion: reduce) {
  .status-shimmer { animation: none; color: var(--text-muted); background: none; }
}
```

For the loading placeholder of the reply itself, `blocks/skeleton` is the neutral choice: two or three lines at 80, 95 and 60 percent width.

## Tokens

- Text: `--text-muted` to `--text` sweep, `--t-body`. Elapsed time `--text-subtle` with `tabular-nums`.
- Feed: new line opacity 1, previous lines 0.5, older 0.3. Entering offset uses `--enter-offset` with `--dur-dropdown` and `--ease-out`, `--stagger-step` between lines.
- Orb: 24px, achromatic, built from `--text` and `--bg` with no blur halo.
- Reduced motion: the tokens already collapse durations and `--enter-offset` to 0. Also stop the shimmer and the orb loop, as in the CSS above.
