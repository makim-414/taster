---
id: media-thumb-strip
name: Media thumbnail strip
category: media-gallery
uses: [browse-media]
surfaces: [app, editorial]
replaces: []
components: [blocks/skeleton]
inspiration: []
status: stable
---

## When to use

Use it to browse a set of images or videos where each item is small and the set is the point: results of a render batch, posts from a feed, frames from a clip, attachments on a record. The reader scans, then opens one.

Do not use it as a product grid. Product cards need a name and a price under the image, so use the storefront patterns for those. Do not use it for fewer than three items; show the items at full size instead.

It also covers two neighbours that share the same tile: an inline embed of an external post, and an editable image slot that accepts a drop or a replacement.

## Anatomy

A tile is a fixed-ratio box (`aspect-ratio: 1 / 1` for mosaics, `16 / 9` or `9 / 16` for video). It holds the image with `loading="lazy"` and `decoding="async"`, an optional play badge in the center, an optional duration in the bottom corner, and a placeholder behind everything.

The strip decides its own count. A strip shows as many tiles as fit in one row, then a final tile reading "+14". A mosaic computes its column count from the container width, not from a breakpoint, and each column is at least 96px.

The placeholder is a skeleton block while loading, and a quiet neutral tile with a small media icon if the image fails. Never leave a broken image icon.

## Do

- Set width and height or an aspect ratio on every tile, so lazy loading never shifts the layout.
- Compute the column count from the container with `ResizeObserver` or CSS `repeat(auto-fill, minmax(96px, 1fr))`. Prefer the CSS form, it needs no script.
- Show the play overlay only for video, as a 40px solid circle with a triangle. Add `aria-label="Play video"` on the button, not on the image.
- Handle the error state: swap to the neutral placeholder on `onError` and keep the tile clickable if the item has a detail view.
- Give the image a real `alt` when it carries content, and an empty `alt` when a caption sits next to it.
- For embeds, show a link to the original next to the embedded post. People want to open the source.

## Don't

- Do not use a masonry layout with CSS columns for a thumbnail set. Balancing breaks and the reading order jumps. Compute a column count and use a grid.
- Do not darken the whole tile with a black gradient to make a play icon readable. Use a solid badge.
- Do not animate every tile in on load with the same fade-up (MOT-01).
- Do not use a drawn gray rectangle with a mountain icon as a stand-in for real content in a shipped screen (AC-17). It is fine as a loading or error state only.
- Do not round tiles to a pill-like radius. Use `--r-md`.
- Do not hide failed tiles. A missing thumbnail the reader cannot see is a bug they cannot report.

## Swap recipe

The slop version is a hand-drawn gallery with fake tiles, a dark gradient on every card and a fade-up on each.

```html
<!-- before: gradient scrim, invented tiles, same entrance on all -->
<div class="grid grid-cols-3 gap-6">
  <div class="reveal relative overflow-hidden rounded-3xl shadow-2xl">
    <img src="a.jpg" class="h-64 w-full object-cover" />
    <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
    <span class="absolute bottom-3 left-3 text-sm uppercase tracking-[0.3em]">Video</span>
  </div>
  <!-- repeated 5 more times, one broken image icon when a file 404s -->
</div>
```

```tsx
// after: auto-fill grid, fixed ratio, lazy images, skeleton then fallback
import { Skeleton } from './blocks/skeleton'

export function Thumb({ src, alt, video }: { src: string; alt: string; video?: boolean }) {
  const [state, setState] = React.useState<'loading' | 'ok' | 'error'>('loading')
  return (
    <div className="relative aspect-square overflow-hidden rounded-[var(--r-md)] border border-[var(--border-soft)] bg-[var(--bg-sunken)]">
      {state === 'loading' && <Skeleton className="absolute inset-0 rounded-none" />}
      {state !== 'error' ? (
        <img
          src={src} alt={alt} loading="lazy" decoding="async"
          onLoad={() => setState('ok')} onError={() => setState('error')}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-[length:var(--t-sm)] text-[var(--text-subtle)]">No preview</div>
      )}
      {video && state === 'ok' && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--bg)] text-[var(--text)]" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </span>
      )}
    </div>
  )
}

export const Strip = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-[var(--sp-2)]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>{children}</div>
)
```

This fixes the scrim and all-caps tracking in the slop version (AC-01) and the repeated entrance (MOT-01).

## Tokens

- Tile radius `--r-md`, border `--border-soft`, empty fill `--bg-sunken`.
- Gap `--sp-2` for mosaics, `--sp-3` for strips with captions.
- Play badge: `--bg` fill, `--text` glyph, no shadow. Duration text uses `--t-xs` with `tabular-nums`.
- Failed state text: `--text-subtle` at `--t-sm`.
- Motion: the skeleton pulse is the only animation. Under `prefers-reduced-motion`, set `animation: none` on the skeleton and show a static `--bg-sunken` tile.
