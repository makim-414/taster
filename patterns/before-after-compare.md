---
id: before-after-compare
name: Before and after compare
category: media-gallery
uses: [compare-versions]
surfaces: [app, landing, editorial]
replaces: []
components: []
inspiration: []
status: stable
---

## When to use

Use it when the reader has to judge a change by looking: a retouched photo against the original, a redesigned screen against the old one, a rewritten paragraph against the draft. One frame, one divider, the same crop on both sides, so the eye compares pixels and not memories.

Do not use it when the difference is a number. Two figures in a table beat a slider. Do not use it as decoration on a landing page unless the "after" is a real output of the product and the "before" is a real input.

Two modes share one pattern: an image mode (a draggable divider over a single frame) and a text mode (two versions listed with removed and added lines marked).

## Anatomy

Image mode is a single positioned box with the same aspect ratio set once. The "before" image fills it. The "after" image sits on top, clipped with `clip-path: inset(0 0 0 var(--split))`, so it is never resized or shifted. A 2px divider line follows `--split`, and a 44px grab handle sits on the line. The real control is a transparent `<input type="range">` stretched over the whole frame, which gives you pointer drag, touch and arrow keys for free.

Labels ("Original", "Edited") are small plain text in the two top corners, on a solid `--bg` chip so they stay readable on any photo.

Text mode is a two-column or stacked list of lines. Each line carries a gutter glyph: a minus for removed, a plus for added, blank for unchanged. Color is a secondary cue only. Unchanged lines beyond three lines of context collapse into a "12 unchanged lines" row.

## Do

- Fix one aspect ratio on the frame (`aspect-ratio: 4 / 3`) and use `object-fit: cover` on both images so the crops match exactly.
- Start the divider at 50 percent. Make the range input the only interactive element, with an `aria-label` like "Compare original and edited" and `aria-valuetext` such as "62 percent edited".
- Keep arrow keys at 1 percent and Page Up and Page Down at 10 percent. Do not trap focus.
- Name both sides with text in the frame. A slider with no labels makes people guess which side is new.
- In text mode, mark removed and added lines with a gutter glyph plus a subtle line background, so the diff survives grayscale and color-blind viewing.
- Reserve the frame height before the images load, so the page does not jump.

## Don't

- Do not autoplay a back and forth sweep. It hides the one thing the reader came for, control of the divider.
- Do not make the handle a glowing gradient orb. A flat 44px circle with a border is enough (COL-07, COL-01).
- Do not crop the two images differently. A shifted "after" reads as a changed composition, not a changed treatment.
- Do not rely on red and green alone for the text diff.
- Do not place the compare in a three-card row with icons above it (LAY-02). It needs width.
- Do not use stock photos you did not edit. The comparison is the proof, so a fake one is worse than none.

## Swap recipe

The slop version puts two images side by side in tinted cards with gradient pills, which makes the reader compare across a gutter and a 50 pixel gap.

```html
<!-- before: two cards, gradient pills, glowing toggle -->
<div class="grid grid-cols-2 gap-6">
  <div class="rounded-3xl bg-indigo-500/10 p-4 shadow-[0_0_40px_rgba(99,102,241,.35)]">
    <span class="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-xs">Before</span>
    <img src="a.jpg" class="mt-3 rounded-2xl" />
  </div>
  <div class="rounded-3xl bg-indigo-500/10 p-4 shadow-[0_0_40px_rgba(99,102,241,.35)]">
    <span class="rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1 text-xs">After</span>
    <img src="b.jpg" class="mt-3 rounded-2xl" />
  </div>
</div>
```

```tsx
// after: one frame, one divider, native range input for pointer and keyboard
export function BeforeAfter({ before, after }: { before: string; after: string }) {
  const [split, setSplit] = React.useState(50)
  return (
    <div
      className="relative aspect-[4/3] overflow-hidden rounded-[var(--r-card)] border border-[var(--border)] bg-[var(--bg-sunken)]"
      style={{ ['--split' as string]: `${split}%` }}
    >
      <img src={before} alt="Original" className="absolute inset-0 h-full w-full object-cover" />
      <img
        src={after}
        alt="Edited"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: 'inset(0 0 0 var(--split))' }}
      />
      <div className="absolute inset-y-0 w-0.5 bg-[var(--text)]" style={{ left: 'var(--split)' }} />
      <span className="absolute left-3 top-3 rounded-[var(--r-sm)] bg-[var(--bg)] px-2 py-1 text-[length:var(--t-sm)] text-[var(--text)]">Original</span>
      <span className="absolute right-3 top-3 rounded-[var(--r-sm)] bg-[var(--bg)] px-2 py-1 text-[length:var(--t-sm)] text-[var(--text)]">Edited</span>
      <input
        type="range" min={0} max={100} step={1} value={split}
        aria-label="Compare original and edited"
        aria-valuetext={`${100 - split} percent edited`}
        onChange={(e) => setSplit(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  )
}
```

The registry `blocks/compare` file is a categorical bar comparison for numbers. Use it when the thing to compare is a set of values. For the draggable frame, copy the snippet above. The slop gradient pills and glow shadow trace back to COL-01 and COL-07, and the identical rounded cards to CMP-04.

## Tokens

- Frame: `--r-card` radius, `--border` hairline, `--bg-sunken` as the loading fill.
- Label chips: `--bg` fill, `--text` color, `--r-sm` radius, `--t-sm` size.
- Divider and handle: `--text` line, handle ring `--border`, handle fill `--bg`. Keep the handle target at 44px.
- Text mode: gutter glyphs in `--font-mono` are acceptable here because they are code-like marks, not decoration. Removed lines use `--danger-soft`, added lines use `--success-soft`, both only behind the text.
- Motion: none on drag. If you animate a reset, use `--dur-dropdown` with `--ease-out` and drop it under `prefers-reduced-motion`.
