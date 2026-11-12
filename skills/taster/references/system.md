# System

Goal: before any screen is built, turn the brand's identity and the builder's intent into one design system: a
balanced setting of the eight weighting axes and every token they drive. Each screen is then rebuilt from the parts
that fit its purpose, all wearing that system. This step sits after Diagnose and Brand on an existing site, and after
the opening questions on a new one. Route: Diagnose, then Brand and references, then System (with the builder), then
Screens.

## 1. Absorb the brand and read the references

Call `design_system { brand, references, axes?, surface?, scheme?, out }` (or
`node <clone>/packages/engine/cli.mjs --system <brand> --ref <page> --axis name=value --out <dir>`, `<clone>` as in
[where the engine comes from](../SKILL.md#where-the-engine-comes-from)).

- `brand`: the owner's site or any page that carries the brand. It decides identity: brand color, typeface, logo,
  light or dark, and the success and failure colors fitted to them (the same intake as [brand.md](brand.md)).
- `references`: pages whose tone the builder likes. They decide the axes. Ask for one or two; more than three
  usually average into nothing.
- `axes`: what the builder already said ("denser", "flatter", "no animation"), as axis values.

Each page is opened in a real browser at 1440 wide and measured (`<clone>/packages/engine/measure.js`). Every measurement is mapped to
the axis step whose generated token is closest, so a page built from a system measures back to the same steps.

Where each axis comes from, first match wins:

1. Builder intent (`axes`), snapped to the nearest step.
2. The references: each one's step, then their mean snapped (ties go to the calmer step).
3. The brand site's own measurement.
4. The taxonomy default.

Then `balance` from `data/taxonomy/axes.mjs` holds every axis the builder set and moves the others the least needed to
satisfy every constraint. `axisNotes` records, per axis, the value, the step name, what it means, where it came from
with the evidence, and, when balance moved it, from which step and the principle of each constraint that forced it.

## 2. Propose the axes in plain words

Show the builder one line per axis with the step name and the evidence, for example:

> Density: airy (cards padded 26px, 48px buttons). Roundness: pillow (18px cards). Type: poster (76px headline over
> 14px body). Color: achromatic, moved from two-hue because "Type and color do not both shout: the louder the type,
> the fewer hues around it."

Offer step names, never free numbers. The steps are in `taxonomy.snap` (density: spacious, airy, regular, snug,
compact; roundness: square, crisp, soft, round, pillow; and so on).

## 3. Let the builder move weights

When the builder moves an axis, call `tune_system { system, axes }` (or
`node <clone>/packages/engine/cli.mjs --tune <dir>/taster.system.json roundness=1`). The moved axes stay where the builder put them;
balance moves the least needed elsewhere, and the summary says which axes moved and quotes the principle:

> roundness set to pillow (1) by the builder. elevation moved lifted (0.25) to raised (0.5): "Radius and depth
> describe one material: the corner radius may not run more than two steps ahead of the shadows."

Show that line to the builder every time. Nothing sits between two steps, and no combination breaks a principle. If
the builder pins two axes that no third axis can reconcile (pillow corners and heavy borders), the tool refuses and
names the constraint; ask which one gives way.

## 4. Write it and use it

`out` (or `--out`) writes `taster.system.json` and `theme.css`. Load `theme.css` after `packages/registry/src/tokens.css` on
every screen and in every part. Components read the alias tokens only (`var(--r-card)`, `var(--sp-4)`,
`var(--sh-card)`, `var(--dur-press)`); never type a value from the system into a component.

`taster.system.json` keeps the brand under `identity` (name, logo, color, fonts, tokens, notes). `identity.logoFont`
is the face the logo wordmark is set in, read apart from the heading and body faces. It is not a system typeface:
`--font` still comes from heading and body. The consistency check reads it as an identity exemption, so that face
inside the site's logo is listed as exempt instead of off the system ([screens.md](screens.md)). Point the plan's
system at `taster.system.json` (or end the list with it) so every screen check carries it.

For one part, `system_for_category { system, category }` lists the axes in order of `taxonomy.relevance` for that
category, with this system's step and the tokens each drives, so the part's builder knows which values matter most.
`copy` has none: wording is governed by rules.

## Measurement to axis

The yardstick for each axis is the token the system generates at each step. A measured value takes the nearest step;
the cut points below are the midpoints between steps (log midpoints for ratios), ties to the lower step.

| Axis | What is measured | Steps compared | Cut points |
|---|---|---|---|
| density | median control height (buttons, fields, links that read as buttons) | `--control-md` 40, 38, 36, 34, 32 px | 39, 37, 35, 33 |
| density | median card padding (mean of four sides) | `--sp-6` 30, 28, 24, 22, 18 px | 29, 26, 23, 20 |
| density | median flex and grid gap | `--sp-5` 26, 22, 20, 18, 16 px | 24, 21, 19, 17 |
| density | body line height, median by characters | `--lh-normal` 1.6, 1.55, 1.5, 1.45, 1.4 | 1.58, 1.52, 1.48, 1.42 |
| density | the mean of the steps the signals above land on, snapped | | |
| contrast | lower quartile (by characters) of body text contrast against what is behind it | muted text on the page: dark 6.51, 7.84, 10.1, 13.27; light 5.26, 6.02, 7.73, 10.9 | dark 7.15, 8.9, 11.58; light 5.63, 6.82, 9.18 |
| roundness | median card radius; without cards the control radius divided by 0.8 | `--radius` 0, 4, 10, 14, 20 px | 2, 7, 12, 17 |
| roundness | only pill shaped controls and no cards | round | |
| type-expression | largest text over body text (median by characters) | `--t-display` over a 14px body: 1.57, 2.07, 2.57, 3.43, 4.29 | 1.8, 2.31, 2.97, 3.83 |
| type-expression | weight of the largest text: 800 or more one step up, 400 or less one step down | | |
| color-restraint | hue families among colors with OKLCH chroma 0.05 or more, weighted by painted area; a family is hues within 35 degrees and counts at 3% of the colored weight | none: achromatic; one: achromatic, or one-hue when colored fills cover 15% of the page; two: two-hue; three or more: below the floor, snapped to two-hue | |
| elevation | median shadow reach (offset + blur + spread, outer layers) on cards, when a quarter of the cards have one | `--sh-card` reach 0, 3, 8, 22, 40 px | 1.5, 5.5, 15, 31 |
| elevation | shadows only on controls or overlays | the same, one step lower | |
| motion | median duration of transitions that move something (not only color, opacity or shadow) | mean of `--dur-press`, `--dur-tooltip`, `--dur-dropdown`: 107, 133, 162, 190, 220 ms | 120, 148, 176, 205 |
| motion | only fades, or interactive elements with no transitions | still | |
| motion | keyframe animations: one or two lift it to lively, three or more to expressive | | |
| stroke | median contrast of card borders and divider rules against what is behind them | `--border` on the page: dark 1, 1.16, 1.31, 1.6, 2.36; light 1, 1.2, 1.31, 1.52, 1.99 | dark 1.08, 1.23, 1.45, 1.98; light 1.1, 1.25, 1.42, 1.75 |
| stroke | borders 2px or wider: heavy; cards with no border at all: none; any border at least hairline | | |

An axis with nothing to measure (no cards, no text) has no evidence and falls through to the next source.

## Tokens from the axes

Each axis has one value per step, lowest step first. The regular or default step reproduces `packages/registry/src/tokens.css`
exactly, so a system at the defaults changes nothing.

| Axis | Tokens | Per step |
|---|---|---|
| density | `--sp-1` to `--sp-16` | base (4, 8, 12, 16, 20, 24, 32, 48, 64) times 1.25, 1.125, 1, 0.875, 0.75, rounded to 2px |
| density | `--control-sm`, `--control-md` | 36, 34, 32, 30, 28 and 40, 38, 36, 34, 32 px; `--control-touch` stays 44 |
| density | `--lh-normal`, `--lh-snug` | 1.6 to 1.4 and 1.35 to 1.25 in even steps |
| contrast | `--muted-foreground`, `--text-subtle`, `--muted`, `--secondary` | OKLCH lightness; dark: 0.66, 0.708, 0.78, 0.86 / 0.65, 0.65, 0.7, 0.76 / 0.25, 0.269, 0.29, 0.31; light: 0.52, 0.49, 0.43, 0.35 / 0.52, 0.51, 0.46, 0.4 / 0.96, 0.95, 0.935, 0.92 |
| roundness | `--radius` and `--r-sm` to `--r-4xl` | radius 0, 4, 10, 14, 20 px; the scale is radius times 0.6, 0.8, 1, 1.4, 1.8, 2.2, 2.6; `--r-pill` stays |
| type-expression | `--t-display`, `--t-h1`, `--t-h2`, `--t-title` | 22, 29, 36, 48, 60 / 20, 25, 30, 37, 44 / 18, 21, 24, 28, 32 / 15, 16, 16, 17, 18 px; body sizes stay |
| type-expression | `--lh-tight`, `--w-semi` | 1.25, 1.175, 1.1, 1.05, 1 and 500, 600, 600, 700, 700 |
| type-expression | `--font` | the brand's typeface when it was a real choice, else IBM Plex |
| color-restraint | `--brand` | the brand color at every step (identity wins); neutral when there is none |
| color-restraint | `--accent-soft`, `--success-soft`, `--warning-soft`, `--danger-soft` | the brand or meaning color at 20%, 16%, 12% alpha (two-hue, one-hue, achromatic) |
| color-restraint | `--chart-1` to `--chart-6` | one lightness ramp; achromatic: gray; one-hue: the brand hue at chroma up to 0.14; two-hue: brand and highlight hues alternate |
| color-restraint | `--highlight` | gray, except two-hue: the brand hue turned 150 degrees, kept 35 degrees from green and red |
| elevation | `--sh-card`, `--sh-pop` | none, then shadows of reach 3, 8, 22, 40 px on cards and 32 to 64 px on floating layers, black only |
| elevation | `--card`, `--popover`, `--scrim` | dark: card white at 2 to 6%, popover lightness 0.16 to 0.22, scrim 45 to 70%; light: white surfaces, scrim 30 to 55% |
| motion | `--dur-press`, `--dur-tooltip`, `--dur-dropdown`, `--dur-modal`, `--stagger-step` | 100 to 200, 100 to 180, 120 to 280, 150 to 450, 0 to 80 ms |
| motion | `--press-scale`, `--enter-scale`, `--enter-offset`, `--blur-mask` | 1 to 0.95, 1 to 0.92, 0 to 16px, 0 to 6px; still has no movement at all |
| stroke | `--border`, `--border-soft`, `--input` | alpha 0, 8, 12, 18, 28%; 0 to 0.22; fields 12 to 40% (fields always keep a visible edge) |
| stroke | `--icon-stroke` | 1.5 with no borders, else 2 |

`theme.css` re-states the reduced motion block of `tokens.css` (durations 1ms, no scale, no offset) and the reduced
transparency block, so the system's own values never override a person's setting.

A light scheme (from a light brand site, or `scheme: light`) also sets the surfaces and text the dark core does not:
background, foreground, primary, sidebar, info and warning.

## Contrast floor

Every system asserts WCAG AA (4.5:1) for body, muted and subtle text on the page, card, popover, muted and secondary
surfaces, for success and failure colors on the page, and for the text color on the brand color. If text on the
brand color is under 4.5:1, it moves to white or black, whichever reads better, and a note says so. A system that
fails the floor is not written.
