# Taxonomy schema

`taxonomy.json` is the one source for how Taster names UI parts, how it decides which category a part belongs to,
and how a builder's tone settings (the weighting axes) are kept balanced. Its shape is in `taxonomy.schema.json`.
Everything the schema cannot express (cross references, partition, decision key, constraints, coverage) is enforced by
`scripts/check-taxonomy.mjs`, which `scripts/validate.mjs` and CI run on every change.

```bash
node scripts/check-taxonomy.mjs        # TAXONOMY OK ... on success
node --test data/taxonomy/axes.test.mjs     # the axes module
node scripts/build-docs.mjs            # after any change: refreshes gaps, READMEs and the skill bundle
```

## Top level

| Key | What it holds |
|---|---|
| `features` | The boolean feature vocabulary the decision key reads |
| `classify` | The decision key: ordered steps, first match wins |
| `families` | 8 families that partition the categories |
| `categories` | 33 categories of UI parts |
| `uses` | What the end user is trying to do (patterns serve uses) |
| `surfaces` | The kind of screen (patterns target surfaces) |
| `axes` | The weighting axes and the CSS custom properties each one drives |
| `snap` | The allowed steps per axis |
| `relevance` | How much each axis matters per category, 0 to 1 |
| `constraints` | Design principles as linear inequalities over axes |
| `ruleMap` | Every slop rule, the categories it applies to and the axis it pushes |
| `gaps` | Categories with no registry component and fewer than two patterns (generated) |
| `iconography` | The icon slot map, see `data/patterns/icon-placement.md` |

## Nodes

Every family, category, use and surface carries the same fields:

| Field | Rule |
|---|---|
| `id` | kebab-case, unique in its kind |
| `name`, `name_ko` | unique in their kind; `name_ko` is the only Korean in the file |
| `definition` | one sentence: what it is |
| `includes` | concrete criteria for what belongs (categories need 3 or more) |
| `excludes` | `{ what, goes_to }`: each excluded thing names the node of the same kind it belongs to instead |
| `examples` | generic examples, no brand or site names; no example or include may appear under two nodes of one kind |

Categories also name their `family`; families list their `categories`. The two must agree, and every category sits
in exactly one family. Uses keep their `question`, the end user's question the use answers.

## Decision key

A UI part is described by the features that are true for the part itself (never for the parts nested inside it).
`classify` is an ordered list of steps:

```json
{ "all": ["orders_in_time"], "none": ["is_page_section"], "category": "timeline-stepper", "why": "..." }
```

A step matches when every feature in `all` is present and every feature in `none` is absent. The first match decides
the category, so categories are mutually exclusive by construction. The last step has no conditions and
`"fallback": true`, so every input gets a category and the key is jointly exhaustive. The fallback exists only to keep
the function total: a fixture that reaches it fails the check.

The order is the boundary policy, and each step's `why` states it. In short: depth and motion effects first, then the
foundations that hold for every part (wording, theme values, marks, type), then domain content models (assistant
conversation, goods, plans, questions, third party proof, keyboard commands), then page bands (opening, end, global
navigation, single request), then sequence, waiting and measured values, then the remaining page band, then the
generic part kinds (absence, value controls, overlays, in-place switches, actions, events, labels, columns, media,
containers, structure).

`data/taxonomy/classify.mjs` exports `classify(features)` and `createClassifier(spec)`; both return
`{ category, step, fallback }`.

The checker proves the key is sound: every step reads known features and ends in a known category; no step requires
and forbids the same feature; no step is shadowed by an earlier one (an earlier step whose `all` and `none` are subsets
of a later step's always fires first); every category is returned by some step; every feature is read by some step.
`data/taxonomy/fixtures/parts.json` holds over 100 generic parts with their features and expected category, including the
hard boundary cases (a date field with a popover, a mega menu, a band of figures, a live step list, a logo marquee);
each must classify exactly, every step must be reached by some part, and no part may reach the fallback.

### Adding or changing a category

1. Add the node with every field, put its id in exactly one family, and add a relevance row for every axis.
2. If no existing feature tells it apart, add a feature with a one sentence definition.
3. Insert a step at the place in `classify` where its boundary policy holds, with a `why`.
4. Add at least one part to `fixtures/parts.json` for the new category and one for each boundary it shares.
5. Migrate every reference when you rename or split: pattern frontmatter, `data/patterns/INDEX.json`,
   `packages/registry/registry.json`, `ruleMap`, skill references and READMEs. Then run `node scripts/build-docs.mjs` and
   `node scripts/check-taxonomy.mjs`.

## Axes

Each axis is a dial from 0 to 1:

```json
{
  "id": "density",
  "name": "Density",
  "name_ko": "...",
  "definition": "How much fits in one view: spacing between and inside groups, control height and body line height.",
  "anchors": { "0": "Spacious: ...", "0.5": "Regular: ...", "1": "Compact: ..." },
  "drives": ["--sp-1", "--sp-2", "--sp-3", "--sp-4", "--sp-5", "--sp-6", "--sp-8", "--sp-12", "--sp-16",
             "--control-sm", "--control-md", "--lh-normal", "--lh-snug"],
  "default": 0.5,
  "rationale": "..."
}
```

`drives` lists the exact custom properties in `packages/registry/src/tokens.css` the axis controls. Every name must exist in
the `:root` block there, and no property is driven by two axes, so a setting maps to tokens without conflict.
Properties that are floors rather than tone (body and small type sizes, `--control-touch`, `--r-pill`, easing curves,
semantic colors) are deliberately driven by no axis.

| Axis | 0 | 1 | Steps |
|---|---|---|---|
| density | spacious | compact | 0, 0.25, 0.5, 0.75, 1 |
| contrast | washed out (not allowed) | maximum | 0.25, 0.5, 0.75, 1 |
| roundness | square | pillow | 0, 0.25, 0.5, 0.75, 1 |
| type-expression | quiet | poster | 0, 0.25, 0.5, 0.75, 1 |
| color-restraint | rainbow (not allowed) | achromatic | 0.5, 0.75, 1 |
| elevation | flat | layered | 0, 0.25, 0.5, 0.75, 1 |
| motion | still | expressive | 0, 0.25, 0.5, 0.75, 1 |
| stroke | no borders | heavy lines | 0, 0.25, 0.5, 0.75, 1 |

Ornament is not an axis. Decoration (blobs, glows, gradient text) is a rule to pass, not a dial to turn; a dial for it
would make slop a setting. Line weight, the token-backed part of a decorative tone, is the `stroke` axis.

### Snap

`snap[axis].steps` are the only values a setting may take, each with a name in `snap[axis].names`. This is the
no-ambiguity rule: a setting is always one recognizable step, never somewhere between two. Every step must be usable
(some balanced setting reaches it), and every default must be a step.

### Relevance

`relevance[category][axis]` is how much the axis matters for that category, in quarters from 0 to 1. A design system
engine uses it to decide which axes to show the builder for a given part. `copy` is all zeros on purpose: wording is
governed by rules, not by visual dials.

### Constraints

Design principles as linear inequalities over axis values:

```json
{
  "id": "dense-screens-quiet-type",
  "principle": "The more a screen holds, the quieter its type: a compact data screen cannot carry poster headlines.",
  "terms": { "density": 1, "type-expression": 1 },
  "op": "<=",
  "bound": 1.25,
  "prevents": ["TYP-04", "TYP-05"]
}
```

A constraint holds when `sum(terms[axis] * setting[axis]) op bound`. A bound on one axis is a constraint with one term.
`prevents` names the slop rules the principle stops at the token level; each of those rules must be mapped in
`ruleMap` to one of the constraint's axes. The checker proves the defaults satisfy every constraint and that the
constraints are satisfiable on the snapped grid.

## Weighting module: data/taxonomy/axes.mjs

```js
import { AXIS_IDS, DEFAULTS, STEPS, snapValue, validateAxes, balance, createAxes } from './taxonomy/axes.mjs';

validateAxes(settings)            // -> [{ code, axis?, constraint?, value?, nearest?, op?, bound?, prevents?, message }]
balance(settings, changedAxis)    // -> a complete, snapped setting that satisfies every constraint
snapValue(axisId, value)          // -> the nearest step (ties go to the lower step)
createAxes(spec)                  // -> the same functions over another taxonomy object
```

Settings are plain objects `{ axisId: number }`; missing axes take their defaults. `validateAxes` codes:
`unknown-axis`, `not-a-number`, `out-of-range`, `off-step` (with `nearest`) and `constraint` (with `prevents`).

### Balance

`balance(settings, changedAxis)` is deterministic and works like this:

1. Fill missing axes with defaults, clamp every value to 0..1 and snap it to its nearest step (ties to the lower step).
2. Hold `changedAxis` at its snapped value. Search the snapped grid of the other axes for settings that satisfy every
   constraint, and return the one that moves the other axes least, compared in this order:
   1. smallest total movement (sum of absolute changes),
   2. fewest axes moved,
   3. smallest change on each axis in declared order (axes listed later give way first),
   4. the lower value when the same amount of change could go up or down (toward calm).
3. Only if no setting of the other axes can live with the changed value does the changed axis itself step back, to
   the nearest step that works. The checker proves every step of every axis is usable, so with the repository
   taxonomy this never happens.
4. With `changedAxis` null, every axis is free and the same order applies, which snaps and repairs any input.

The search is exact: a depth-first walk over the snapped steps with branch and bound on total movement, checking each
constraint as soon as its axes are assigned. Snapping first and searching the grid (rather than projecting onto the
constraints and snapping afterwards) is what guarantees the result is both on a step and valid; a projected point can
snap onto a step that breaks a constraint.

`scripts/check-taxonomy.mjs` sweeps balance over every step of every axis from 40 seeded starting settings (half off
the grid), checks each result is valid, snapped, deterministic and keeps the changed axis, and compares the movement
against a brute force minimum over every feasible grid point for a subset.

## Rule map

`ruleMap["AC-04"] = { "categories": ["badge-label"], "axis": "color-restraint" }`. Every rule in `data/rules/rules.json`
has an entry. `categories` are where the tell shows up. `axis` is the dial whose extreme produces the tell, or `null`
when the rule is a ban that no dial setting causes (most copy, Korean type and responsive rules). The rule entries
themselves stay unchanged, because `packages/engine/scripts/check-rules.mjs` pins their keys.

## Gaps

`gaps` lists categories with no registry component and fewer than two patterns, with the counts. It is generated by
`node scripts/build-docs.mjs` and checked to be current, so it always tells the component library where to add next.

## Negative controls

`data/taxonomy/fixtures/broken/*.json` each patch a copy of the taxonomy into a known broken state and name the error code
the checker must report: overlap (a category in two families, a shared example), orphan (a category in no family, a
use or surface no pattern serves, a feature no step reads), dangling or self exclusions, unknown ids, a shadowed
step, an unreachable category, a missing fallback, drive collisions and unknown properties, missing coverage, an off
step default, defaults that break a constraint, an unsatisfiable constraint, a rule map that disagrees with a
constraint, stale gaps and a two sentence definition. If the checker ever stops catching one of them, the check fails.

Patch operations: `set`, `push`, `delete` and `insert` (with `after`). Path segments are keys, indexes or a matcher
object such as `{ "id": "hero" }` or `{ "category": "map" }` that finds an array element by its fields.
