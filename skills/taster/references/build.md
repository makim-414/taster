# Build

Goal: a new screen made only of patterns that are known not to read as generated.

## 1. Frame it

Write down, before any code: the product in one sentence, who the screen is for, the surface (one id from
`data/taxonomy.json` surfaces), and the real content you have (names, numbers with sources, images the user owns).
If content is missing, ask for it or leave a clearly marked gap. Never invent numbers or testimonials.

Then the brand ([brand.md](brand.md)): their color, typeface and logo file, absorbed with `brand_theme` from any page
they already have, or the Taster defaults if they have none. Save the theme as `theme.css` and load it after the
tokens.

## 2. List the uses in order

Read the `uses` in the taxonomy and pick the ones this screen must serve, in reading order. A landing page is
usually: introduce the product, show how it works, prove trust, compare plans, answer doubts, ask for the action.
A dashboard is usually: show one number, show a trend, compare items, act on a row.

## 3. Pick one pattern per use

From `data/patterns/INDEX.json`, filter by surface and use. Prefer patterns with `status: stable` and with
registry components. Read each pattern's "Do" and "Don't" before you write the section.

## 4. Compose

- Tokens first (`registry/src/tokens.css` or the user's tokens), then layout, then components, then copy.
- One accent color at most. Neutral surfaces. Hierarchy from size, weight and space, not from color.
- Vary section layouts; three equal cards with icons in a row is a rule violation, not a default.

## 4b. Place icons by slot

Before any icon goes in, open `data/patterns/icon-placement.md` and the `iconography` block of `data/taxonomy.json`.
For each place you want an icon, name its slot (control, explanatory, identity, data marker, no icon) and run the
slot's `test`. Keep the icon only when the test passes; otherwise use the slot's `instead`. Survivors come from one
set at one stroke weight and the three sizes (the registry `icons/icon` component and its tokens), sit on the first
line of their label, and are `aria-hidden` unless they are the only content of a control. Logos and partner marks are
the original files, never redrawn. Most feature cards end up with no icon.

Each slot lists five `variations` with `use_when` and `shows`. Pick the one whose `use_when` matches the spot and
follow its `shows`; `examples/icon-slots/index.html` in the repository renders all 25.

## 5. Check before you show

Run Diagnose on the result at 1440 and 390, ICO rules included. Show the user the screen together with the clean detector report.
