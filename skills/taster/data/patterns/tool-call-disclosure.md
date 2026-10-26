---
id: tool-call-disclosure
name: Tool call disclosure
category: chat-ai
uses: [ask-the-assistant, show-progress]
surfaces: [ai-chat]
replaces: []
components: [blocks/accordion]
inspiration: []
status: stable
---

## When to use

Use it when an agent calls tools while it answers: search, read a file, query a table, run a command. Operators and careful users want to know what happened, but most of the time they do not want to read it. A disclosure line gives them a one-line summary by default and the arguments on demand.

Do not use it to narrate every internal thought of the model. If a step has no effect outside the model, leave it out. Do not use a raw JSON dump as the closed state.

## Anatomy

One row per call, in the thread between paragraphs. Closed state, a single line of about 36px:

- a status mark at the start: a small spinner while running, a check glyph when done, a cross when failed (a shape, not only a color)
- the tool name in plain words ("Searched the web", "Read 3 files"), not the function identifier
- a short summary on the same line in muted text ("12 results for 'late suppliers'")
- a chevron at the end

Open state shows the arguments and the result, in `--font-mono` at small size, inside a bordered block with a maximum height and its own scroll. Consecutive calls of the same kind may group under a header "Used 4 tools" with a count by type.

## Do

- Build it on `blocks/accordion` so the trigger is a real button with `aria-expanded` and the panel is labeled by it.
- Keep running calls open by default only if they are the active step, and close them when they finish.
- Show elapsed time for calls longer than two seconds, in `tabular-nums`.
- Render failures in plain language with the error text in the open state, and a retry if it is safe.
- Redact secrets and personal data from displayed arguments before they reach the client.
- Truncate long outputs with a "Show all" link, never print megabytes inline.
- Use a human verb in the label: "Searched", "Read", "Updated", not `tool_use`.

## Don't

- Do not put each call in a big card with an icon tile, a title and a badge (CMP-03, AC-04).
- Do not use a pulsing colored dot as the running state (AC-08). A small spinner or a text "Running" is clearer.
- Do not set the whole row in monospace (AC-09). Only the arguments are code.
- Do not stack twenty rows. Group them.
- Do not color the status with a tinted pill (AC-04). The glyph carries meaning, the text color stays neutral.
- Do not hide that an action changed something. If a tool wrote data, say "Updated 2 rows" in the summary.

## Swap recipe

The slop version turns each call into a feature card with a glowing status pill and raw JSON.

```html
<!-- before: card per call, tinted pill, glowing dot, raw JSON visible -->
<div class="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 shadow-[0_0_30px_rgba(99,102,241,.3)]">
  <div class="flex items-center gap-2">
    <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
    <span class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-mono uppercase tracking-[0.2em] text-emerald-300">tool_use</span>
  </div>
  <pre class="mt-3 text-xs">{"query":"late suppliers","limit":20,"filters":{...}}</pre>
</div>
```

```tsx
// after: one line closed, arguments on demand
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './blocks/accordion'

export function ToolCall({ call }: { call: ToolCallView }) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={call.id} className="border-b border-[var(--border-soft)]">
        <AccordionTrigger className="gap-[var(--sp-2)] py-[var(--sp-2)] text-[length:var(--t-sm)]">
          <StatusMark state={call.state} />
          <span className="text-[var(--text)]">{call.label}</span>
          <span className="truncate text-[var(--text-muted)]">{call.summary}</span>
          {call.elapsedMs > 2000 && <span className="ml-auto tabular-nums text-[var(--text-subtle)]">{(call.elapsedMs / 1000).toFixed(1)}s</span>}
        </AccordionTrigger>
        <AccordionContent>
          <pre className="max-h-60 overflow-auto rounded-[var(--r-md)] bg-[var(--bg-sunken)] p-[var(--sp-3)] font-[family-name:var(--font-mono)] text-[length:var(--t-xs)]">
            {JSON.stringify(call.args, null, 2)}
          </pre>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
```

The glow, tinted pill and pulsing dot are COL-07, AC-04, AC-08, and the tracked all-caps label is AC-01. In the fix, the only colored thing left is nothing: state is a glyph.

## Tokens

- Row: `--border-soft` bottom hairline, padding `--sp-2`, label `--t-sm`, summary in `--text-muted`.
- Open block: `--bg-sunken`, `--r-md`, `--font-mono` at `--t-xs`, max height 240px.
- Status glyphs: neutral `--text-muted`; a failure uses `--danger` for the glyph only.
- Motion: open and close at `--dur-dropdown` with `--ease-out`. The running spinner rotates; under `prefers-reduced-motion` replace it with the static text "Running".
