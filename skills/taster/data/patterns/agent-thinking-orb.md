---
id: agent-thinking-orb
name: Agent thinking orb
category: chat-ai
uses: [show-progress, ask-the-assistant]
surfaces: [ai-chat]
replaces: [AC-07]
components: [motion/thinking-orb]
inspiration: [https://libraries.dev/orbs]
status: stable
---

## When to use

Use it beside an agent's name or status line while it works, when the wait is long enough to notice and the product has a chat or agent surface. The orb says one thing: the agent is alive, and what kind of work it is doing.

Do not use it for page loads or short fetches, where a skeleton is honest. Do not leave the stock look in place: an orb every product shares reads as generated, the same way a default gradient does. Make a recipe first.

## Anatomy

- The orb, at 64 for an avatar, 32 for a compact row, 20 inline with text.
- A state that matches the work: searching for retrieval, connecting for tool calls, composing while writing, weaving when merging sources, shaping while building a file, breathing while waiting on the person.
- A recipe: state, speed, dot count, dot size, tint and the state's own knobs, as plain data, so it can be saved in a file. `registry/recipes/orbs.json` has examples to start from.
- A line of text next to it that names the step in words. The orb alone is not a status.
- Past `frame`, the shape itself can change: your own mark drawn in dots.

## Do

- Change state when the work changes. A search that becomes writing should change from searching to composing.
- Tint from `--brand` only if the brand color holds up small; ink is often better.
- Slow it down for long work. A fast orb for two minutes feels anxious.
- Give it an `aria-label` that names the step, and keep the visible text.
- Add a good variation to `registry/recipes/orbs.json` with your handle, so others can start from it.

## Don't

- Do not ship the default recipe unchanged because it was already there.
- Do not cycle states for decoration when nothing changed underneath.
- Do not add a glow, a blur halo or a gradient behind the orb (COL-07, BG-01).
- Do not run several orbs at once in one thread. Only the latest step gets one.
- Do not use it as the only sign of progress when real progress is known. Show the count.

## Swap recipe

Slop: one spinning gradient blob, with no word for what is happening.

```tsx
<div className="h-8 w-8 animate-spin rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 blur-sm" />
```

Fixed: the state matches the work, the variation is a recipe, and the text says the step.

```tsx
import { ThinkingOrb } from './motion/thinking-orb'

const recipe = { state: 'searching', speed: 0.75, dots: 1.5, dotSize: 0.7, opts: { scanMul: 2.5 } }

<p className="flex items-center gap-2 text-text-muted">
  <ThinkingOrb recipe={recipe} size={20} aria-label="Searching the docs" />
  Searching the docs
</p>
```

## Tokens

- Ink: follows the theme read from `--bg`, so it stays right when the OS and the page disagree.
- Tint: `tint="brand"` reads `--brand`; any token or CSS color works.
- Text beside it: `--text-muted`, `--t-sm`.
- Motion: reduced motion draws one still frame, handled by the package. No token needed.
