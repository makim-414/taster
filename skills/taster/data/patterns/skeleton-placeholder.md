---
id: skeleton-placeholder
name: Skeleton placeholder
category: loader-skeleton
uses: [show-progress]
surfaces: [app, dashboard]
replaces: [MOT-01]
components: [blocks/skeleton]
inspiration: [https://ui.shadcn.com/docs/components/skeleton]
status: stable
---

## When to use

When content takes longer than about 300ms to arrive and its shape is known: a list of cards, a table, a profile, a dashboard. A skeleton reserves the space so the page does not jump, and tells the eye where things will land.

For work with a known length (upload, export) use a progress bar. For a quick action on a button (save), use an inline spinner in the button. For a page whose shape is unknown, a small centered spinner is honest.

## Anatomy

- Shapes mirror the real layout: a 40px circle where the avatar goes, a 14px bar at 60% width where the title goes, two 12px bars at 100% and 80% for the body, a 120px block for the chart.
- Fill: `--bg-elev` (a one-step lighter surface than the page). Radius follows the element: `--r-md` for bars, `--r-pill` for avatars, `--r-card` for blocks.
- Motion: a slow opacity pulse between 100% and 55% over 1.6 to 2 seconds. No moving shimmer gradient, no colored sweep.
- Handoff: the skeleton stays still while real content fades in over it (150 to 200ms opacity), then the skeleton unmounts. Heights match, so nothing shifts.
- Registry `Skeleton` is a div with `animate-pulse rounded-md bg-bg-elev`; compose card, table and page skeletons from it.

## Do

- Build skeletons from the same component tree as the loaded view, with the same paddings, so they cannot drift.
- Show 3 to 6 placeholder rows, not 20. It is a hint, not a promise.
- Set `aria-busy="true"` on the region and `aria-live="polite"`; provide a visually hidden "Loading orders" text.
- Delay showing the skeleton by about 150ms so fast loads do not flash it.
- Turn off the pulse under `prefers-reduced-motion` and keep the static shapes.

## Don't

- Don't use a bright shimmer that sweeps across at an angle in a purple or blue gradient.
- Don't make skeleton shapes that do not match the loaded content, such as three bars where a table appears.
- Don't leave the skeleton up when the request failed. Replace it with the error state.
- Don't fade every real block in from below on scroll (MOT-01). Fade in the swap from skeleton to content only.
- Don't use skeletons for content that is already cached. Show the cached content.

## Swap recipe

Slop version (fixes MOT-01):

```css
.skeleton {
  background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #6366f1 100%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  border-radius: 16px;
}
.reveal { opacity: 0; transform: translateY(24px); animation: rise 0.8s forwards; }
```

Fixed version:

```tsx
import { Skeleton } from './blocks/skeleton'

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3" aria-hidden>
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  )
}

function Orders({ status, rows }: Props) {
  if (status === 'loading') {
    return (
      <div aria-busy="true">
        <span className="sr-only">Loading orders</span>
        {Array.from({ length: 4 }, (_, i) => <RowSkeleton key={i} />)}
      </div>
    )
  }
  return <OrderList rows={rows} className="animate-in fade-in duration-200" />
}
```

Add `@media (prefers-reduced-motion: reduce) { .animate-pulse { animation: none } }` if your Tailwind setup does not already do it.

## Tokens

- Fill: `--bg-elev`. On a card surface, use `--bg-sunken` for contrast.
- Radius: `--r-md` bars, `--r-pill` avatars, `--r-card` blocks.
- Space: reuse the real component's `--sp-*` values.
- Motion: pulse 1.6 to 2s ease-in-out; swap-in fade `--dur-dropdown` with `--ease-out`; reduced motion removes the pulse.
- No gradients, no `--accent` in skeletons.
