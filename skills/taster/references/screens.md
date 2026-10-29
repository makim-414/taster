# Screens, one at a time

Goal: a product whose screens all look like one product. The brand's tone and the builder's intent become a design
system first. Then each screen is rebuilt (or swapped, or built) from the components that fit its purpose, drawn only
from that system, one screen or one part at a time, and the builder says yes before anything is built and sees it
checked before the next one starts.

Use this loop whenever the work covers more than one screen, on every route: [swap.md](swap.md),
[rebuild.md](rebuild.md) and [build.md](build.md) each hand over to it after their first screen.

## 1. The system comes first

Before any screen, settle the design system every screen will wear:

- the tokens (`registry/src/tokens.css`, or the user's own token file), and
- the brand on top of them: `theme.css` from `brand_theme` ([brand.md](brand.md)), or a system file made by the
  system tool when the repository has it. Either shape works for the checks below: a CSS file whose `:root` holds
  the custom properties, or JSON with a `tokens` map of custom property to value.

Show the builder the theme notes and get their yes on color, typeface and logo before the first screen.

## 2. Plan the screens

Call `plan_screens { target, route, system, out }` (or `node engine/cli.mjs --plan <url> --out <dir> --system
<file>`). It reads the start page and lists it first, then every page on the same site its navigation links to, in
the order the navigation shows them. It writes `taster.plan.json`:

```json
{
  "version": 1,
  "route": "rebuild",
  "system": ["tokens.css", "theme.css"],
  "screens": [
    { "id": "home", "source": "https://example.com/", "output": null, "purpose": "Introduce the product",
      "parts": [], "status": "planned", "notes": "" }
  ]
}
```

`status` moves `planned`, `proposed`, `approved`, `built`, `checked`, in that order and never skips. Paths are
relative to the plan file. Purposes are drafts from each page's h1 or nav label: confirm the list, the order and
each purpose with the builder, and drop screens they do not want.

## 3. The loop

Call `plan_next { plan }` and do exactly the one thing it returns. Then record what happened with
`plan_update { plan, event }`, and call `plan_next` again.

1. **Propose.** Show the builder the screen (or part): what it is for, the uses it serves in order, the pattern and
   registry components for each use, the content it keeps, and for a long page the parts you will build one at a
   time. Name components the earlier screens already use wherever the job is the same. Record
   `{ type: "propose", screen, parts? }` and stop.
2. **Wait.** Do not build anything. An explicit yes in their language ("yes", "go", "looks right") is approval;
   silence, a question or "maybe" is not. Record `{ type: "approve", screen, note: "<their words>" }`; the plan
   refuses an approval without the builder's words. When they ask for changes, record `{ type: "revise", note }`
   and propose again.
3. **Build.** Build only what was approved, from the system tokens and the same components the checked screens use.
   Record `{ type: "build", screen, output: "<file or URL>" }`.
4. **Check.** Record `{ type: "check", screen }` with no counts and the tool runs the check itself: Diagnose on the
   output at 1440 and 390 (zero measured findings), then `check_consistency` of this screen against every screen
   already checked and against the system (zero drift, zero values off the system). It refuses to mark the screen
   checked until both are zero, or until every finding left is an accepted exception (below). Fix what it lists and check again. After three failed checks on the same finding,
   stop and tell the builder what is in the way.
5. **Show.** Show the builder the checked screen next to its original (or next to the screens before it), with the
   two counts and any accepted exceptions. Then `plan_next` again.

The plan enforces the order: no build before approval, no next part before this part is checked, no next screen
before this screen is checked. An out of order step is refused with the reason.

## Accepted exceptions

Some findings cannot be fixed by the one doing the work. On a stylesheet-only route (a swap or a skin over a site
whose markup you cannot edit), a symbol inside a link's text (AC-03), an em dash in the copy (AC-02) or a value set
inline in the markup stays whatever the stylesheet does. Without a way to record that, the screen can never be
checked and the plan stops at the first screen. Do not fake the counts; record the exception instead:

```json
{ "type": "accept", "screen": "home", "rule": "AC-03",
  "reason": "The arrow is part of the footer link text; removing it needs a markup change",
  "by": "<the builder's own words approving it>" }
```

- Ask the builder first, show them the finding and why it cannot be fixed here, and record their answer in `by`, the
  same way `approve` records theirs in `note`. Both `reason` and `by` are required.
- `rule` is a detector rule id (`AC-03`), or a consistency finding named `drift:<role>:<property>` or
  `off-system:<role>:<property>` (`off-system:link:font-family`). The refused check lists what is left in exactly
  these names (`check.unaccepted`). One accept covers that rule on that screen, at both widths.
- Accept is recorded on the screen (not on a part), while the screen is proposed, approved or built. It does not
  change the status.
- A check then passes when every remaining finding is one of the screen's accepted exceptions; any other finding
  still blocks it. Recording a check with counts yourself needs `remaining`, the list of what is left.
- Accepted exceptions are never hidden: they stay in `taster.plan.json` under the screen's `accepted`, in its notes,
  and in every `plan_next` as `accepted`. The last `plan_next` (`done`) names them again. Hand them to whoever owns
  the markup as the list of changes still to make.

The logo wordmark in its own face is not an exception to accept: declare it as the system's identity instead (see
identity exemptions below).

## Part by part

For a long page, propose the screen with its parts (`{ type: "propose", screen, parts: ["Hero", "How it works",
"Pricing"] }`, or `plan_screens { byPart: true }` to start from the page's sections). After the builder approves the
screen plan, each part goes through the same propose, wait, build and check steps (`part: "<id>"` on each event).
When the last part is checked, the whole screen is checked once more, against the other screens.

## What the consistency check measures

`check_consistency { screens, system }` (or `node engine/cli.mjs --consistency a.html b.html --system tokens.css
--system theme.css`) renders every screen at 1440 and 390 and reads computed values on visible elements by role:

| Role | Found as | Values compared |
|---|---|---|
| button | `button`, `[role=button]`, submit inputs, links drawn as buttons (padded, filled or bordered) | radius, typeface, size, weight, line height, padding, gap, text, fill and border colors, shadow, duration |
| input | text-like inputs, `textarea`, `select` | radius, typeface, size, weight, padding, colors, shadow, duration |
| card | a box with its own fill or a full border, padding of 8px or more and content, inside the page gutters | radius, padding, gap, fill and border colors, shadow, duration |
| h1, h2, h3 | the heading tags | typeface, size, weight, line height, color |
| body | `p` with its own text | typeface, size, weight, line height, color |
| link | `a[href]` not drawn as a button | typeface, weight, color, duration |
| badge | a short label (24 characters or fewer, 32px tall or less) in its own filled or bordered box | radius, typeface, size, weight, padding, colors |

- **Drift** pairs a style that only one screen has with the nearest style of the same role that only another screen
  has, and lists the values that differ, with selectors and screen ids. A style both screens draw the same way is
  the reference. Fill, text and border colors set the variant: a primary and a ghost button are two variants, not
  drift; a heading and an input have one look, so every difference counts.
- **Off system** lists every radius, spacing step (padding and gap), typeface (the first family), color, shadow and
  duration that is not one of the system's tokens, with the nearest token. Each token is resolved the way the page
  resolves it, so `--r-card: var(--radius)` and `calc()` chains count, and a `var()` the system does not define falls
  through to the page's own custom properties. Zero is always allowed for radius, spacing and duration. Kinds the
  system has no tokens for are listed as not checked.
- **Identity exemptions.** The logo wordmark is often set in its own face, which is not a system typeface. A system
  declares it as `identity.logoFont` in `taster.system.json` (the brand intake writes it from the logo it read), or
  the check takes it as `logoFont` (`--logo-font <family>` on the CLI). Then a font-family in exactly that face,
  inside the site's logo (the home link or a `logo` class in the header and footer, and the header's first link), is
  listed under `exempt` with the reason instead of under off system. Nothing else is exempt: the same face on body
  text, and any other value of the logo, stays a finding. Exempt items are printed in their own section and never
  dropped; show them to the builder. A theme CSS carries no identity, so point the plan's system at
  `taster.system.json` (or end the list with it) to carry the exemption into every check.
- **Tolerances.** Lengths within 0.5px are the same; colors within 0.02 in OKLab and 5 of 255 in alpha are the same;
  durations within 1ms are the same. Any radius at or past half the element's short side draws a full pill, so 999px
  and 9999px count as one. Two color sets within 0.08 in OKLab are the same variant drawn slightly off, which is drift.

The report is JSON plus a text summary, in screen order, then role, then property. The CLI exits 1 on any finding.

What it does not prove: that the screens are good, that a variant used on one screen only is the right one (the
system check judges its values, the builder judges its use), or anything about states it cannot see (hover, open
menus, errors). Say so in the report.

## Report

For each screen: the before and after captures at both widths, the rules cleared, the consistency counts against the
screens before it, what the builder approved in their words, and anything left with a reason. At the end, the plan's
last `plan_next` says `done`.

The repository has a worked two screen example in `examples/rebuild/` (`taster.plan.json`, `after.html`,
`pricing.html`) with its own check (`node engine/scripts/check-rebuild-example.mjs`).
