---
id: map-with-pins
name: Map with pins
category: map
uses: [show-relationships]
surfaces: [app]
replaces: []
components: []
inspiration: []
status: draft
---

## When to use

Location is the thing people decide by: clinics near me, stores, venues, regional markets. Use a map with a linked list when someone needs to see both where and which. If place does not change the decision, a list with a city column is better. A world map works as a hero or an overview when countries are the unit, not exact places.

## Anatomy

- Split layout: list on one side (about 360px on desktop), map filling the rest. On phones the map is on top at roughly 40% of the screen with the list under it, and a "Map / List" switch for full screen.
- Base map: a muted, low-contrast style (grays, thin roads, no bright parks or water). The data is the color on the map, not the map.
- Pins: 10 to 12px dots or small markers in `--text` with a 2px `--bg` ring. The selected pin is bigger and filled with `--accent`. Cluster pins show a count, in tabular numerals, at the same weight.
- List rows: name, one line of detail, distance. Hovering a row highlights its pin; hovering a pin scrolls the row into view.
- Moving or zooming the map filters the list to what is visible, with a quiet "Search this area" control when the filter is not automatic.
- Selected item opens a detail panel or a popover anchored to the pin: name, address, one primary action.
- World variant: a flat country map, one-hue fill by value, hover tooltips, no pins.

## Do

- Show the selected pin and the open row in the same state at the same time.
- Keep tap targets for pins at least 40px, even if the dot is small, with an invisible hit area.
- Provide keyboard access: list rows are the accessible path to every pin.
- Show an empty state when the area has no results, with a way to zoom out.
- Cache tiles and add `loading="lazy"` or a placeholder, so the page is useful before the map loads.

## Don't

- Don't put a 3D globe in an app where people need a street.
- Don't use red teardrop markers with emoji or logos for each pin.
- Don't tint the map with a purple-to-blue gradient overlay.
- Don't let the map capture scroll on a long page; require two-finger or a click to engage on phones.
- Don't show 300 individual pins. Cluster them.

## Swap recipe

No catalog rule covers this yet. The usual slop is a dark neon map with glowing markers and floating glass cards.

```css
/* before */
.marker { width: 14px; height: 14px; border-radius: 50%; background: #a855f7; box-shadow: 0 0 20px 6px #a855f7; animation: ping 1.4s infinite; }
.map-card { background: rgba(255,255,255,.08); backdrop-filter: blur(24px); }
```

```css
/* after */
.pin {
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--text); border: 2px solid var(--bg);
}
.pin[aria-selected="true"] {
  width: 16px; height: 16px; background: var(--accent);
}
.map-panel {
  background: var(--popover); border: 1px solid var(--border);
  border-radius: var(--r-card); box-shadow: var(--sh-pop);
}
```

Keep the list as the source of truth: render rows from the same array as the pins, and drive both from one `selectedId` state.

## Tokens

- `--text`, `--bg`: pin fill and ring.
- `--accent`: selected pin.
- `--popover`, `--border`, `--sh-pop`: pin popover and detail panel.
- `--chart-2` to `--chart-5`: country fill ramp in the world variant.
- `--text-muted`, `--text-subtle`: list detail and distance.
- `--r-card`: panel corners.
- `--dur-dropdown`, `--ease-out`: popover and row highlight.
