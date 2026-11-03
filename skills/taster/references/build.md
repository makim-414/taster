# Build

Goal: a new screen made only of patterns that are known not to read as generated.

## 1. Frame it

Write down, before any code: the product in one sentence, who the screen is for, the surface (one id from
`data/taxonomy.json` surfaces), and the real content you have (names, numbers with sources, images the user owns).
If content is missing, ask for it or leave a clearly marked gap. Never invent numbers or testimonials.

Then the brand ([brand.md](brand.md)): their color, typeface and logo file, absorbed with `brand_theme` from any page
they already have, or the Taster defaults if they have none. Ask for one or two reference pages whose tone they like.

## 2. Make the design system with the builder

Follow [system.md](system.md). Call `design_system { brand, references, axes, surface, out }`: the brand gives the
identity, the references give the tone, and anything the builder already said goes in `axes`. Propose the eight
axes (density, contrast, roundness, type-expression, color-restraint, elevation, motion, stroke) by their step names
from `snap`, never as free numbers. When the builder moves one, call `tune_system`: it keeps that axis where it was
put, moves the others the least needed to satisfy every `constraint`, and says which moved, quoting the principle.
Tell the builder. Save `taster.system.json` and `theme.css`; every screen loads `theme.css` after the tokens.

## 2b. List the uses in order

Read the `uses` in the taxonomy and pick the ones this screen must serve, in reading order. A landing page is
usually: introduce the product, show how it works, prove trust, compare plans, answer doubts, ask for the action.
A dashboard is usually: show one number, show a trend, compare items, act on a row.

## 3. Pick one pattern per use

From `data/patterns/INDEX.json`, filter by surface and use. Prefer patterns with `status: stable` and with
registry components. Read each pattern's "Do" and "Don't" before you write the section.

Any block the visitor will see is the user's call, not yours: follow [choose.md](choose.md) and let them pick by eye
before you write it.

## 4. Compose

- Tokens first (`registry/src/tokens.css`, then the system's `theme.css`), then layout, then components, then copy.
- Each part reads the alias tokens only. `system_for_category { system, category }` lists, per part, the axes that
  matter most and the tokens they drive.
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

Done means all of these, and zero overflow is the floor, not the proof:

- no hard-coded colors (`taster lint` on the files you wrote), no slop findings, pageerror 0
- three levels of hierarchy or fewer in any block
- `--widths responsive` (360 to 1440) with no overflow, and the 768, 820 and 1024 captures opened and looked at

Then walk the state matrix before you call a screen finished. Every screen: default, loading, empty, local error, pending change, detail, and the navigation at desktop, tablet and phone width, each reachable by an address such as `?state=empty` so it can be reproduced. The states that go missing most: the moment an agent asks the person something, a goal not met, waiting to start, cancelled, and just confirmed. Give step images an `aria-label` ("Question 2 of 2").

## 6. More screens

A product with more than one screen is built one screen (or one part) at a time, each proposed to the builder and
built only after their yes, then checked against the system and the screens before it with `check_consistency`.
Follow [screens.md](screens.md); start the plan with `plan_screens`, or write `taster.plan.json` by hand from the
screens the builder listed (`source: null`, route `build`).
