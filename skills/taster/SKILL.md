---
name: taster
description: Find and remove AI slop in frontends. Starts by asking whether the site already exists or is being built new. Use when the user wants to check whether a site or screen looks AI generated, review a UI for generic patterns, replace slop with better components, rebuild an existing site they only have the address for, or design and build a landing page, dashboard, app screen, store or editorial page that does not look generated. Triggers on "is my site slop", "does this look AI made", "de-slop", "make this less generic", "review this UI", "redesign this section", "rebuild my site", "redo my Lovable site", "build a landing page", "build a dashboard".
---

# Taster

## Start here: one question

Before anything else, ask the user, in their language:

> Is this a site that already exists, or are we building a new one?

(Korean: "이미 있는 사이트인가요, 아니면 새로 지을까요?") Skip it only when their first message already says which,
and then name the path you are taking in one line. The full opening, including how to tell whether you have the
source, is in [references/start.md](references/start.md).

| Answer | Then | Job |
|---|---|---|
| Already exists, source code is in the workspace | Diagnose, absorb the brand, then replace each spot in their code | Diagnose + Brand + Swap |
| Already exists, only the address (hosted builder, lost source) | Diagnose, absorb the brand, read its content, rebuild it clean | Diagnose + Brand + Rebuild |
| New | Ask for product, audience, kind of screen, real content, brand | Brand + Build |

| Job | Input | Output |
|---|---|---|
| Diagnose | a URL, a running dev server, or a screenshot | every slop spot, marked on a capture, with the rule it breaks and the pattern that fixes it |
| Swap | a diagnosed page plus its source code | the same page with each spot replaced, re checked until clean |
| Brand | the original site, or the owner's color, typeface and logo | a `theme.css` of token overrides (brand color, typeface, success and failure colors fitted to the brand) that every route wears |
| Rebuild | a diagnosed page with no editable source | the same content on a new page made from patterns, checked clean, shown next to the original |
| Build | a product, an audience and a surface | a new screen composed only from taxonomy patterns, checked before you hand it over |

Data this skill reads (all inside this folder):

- [data/rules.json](data/rules.json): the slop rules. `detect.level` says how each is checked: `deterministic` and `heuristic` rules run in the browser through [data/detect.js](data/detect.js); `manual` rules you judge from the capture.
- [data/taxonomy.json](data/taxonomy.json): families, categories, uses (what the end user is trying to do) and surfaces (landing, dashboard, app, commerce, editorial, auth-onboarding, ai-chat). Its `iconography` block is the icon slot map: control, explanatory, identity, data marker and no icon, each with when it needs an icon and what to use instead.
- [data/patterns/INDEX.json](data/patterns/INDEX.json) and `data/patterns/<id>.md`: one reusable design answer per file. Every rule lists its fix patterns in `fix_patterns`.
- [data/registry.json](data/registry.json): token based React components you can copy. Source lives in the repository under `registry/src/`; if this folder was installed alone, fetch the file from `https://raw.githubusercontent.com/makim-414/taster/main/registry/<file>`.

## If the taster MCP server is connected

Prefer its tools; they run the same detector in a real browser for you.

- The `start` prompt asks the opening question for you.
- `diagnose { target }`: findings grouped by rule plus one outlined capture per width (1440 and 390).
- `brand_theme { target }`: the site's brand absorbed into token overrides and a ready `:root` block, with a note per choice.
- `extract_content { target }`: the page's content in reading order (sections, actions, images, nav, footer, brand color and fonts), for Rebuild.
- `suggest_swaps { ruleIds }`: the fix patterns and registry components for each rule found.
- `get_pattern { id }` and `get_component { id }`: the swap recipe and copyable code with its tokens.
- `list_patterns { surface, use, category, family, rule }` and `taxonomy`: for Build.
- `list_rules`, `explain_rule { id }`.

Without the server, follow the steps below with any browser tool, or run `node engine/cli.mjs <url>` from the repository.

## Diagnose

Follow [references/diagnose.md](references/diagnose.md). Short version:

1. Open the page in a real browser at 1440 and 390 wide. Wait for fonts and network idle.
2. Run `data/detect.js` in the page with `{ highlight: true }`. Capture both widths with the outlines on.
3. Walk the `manual` rules over the captures yourself.
4. Report a table: rule id, what it is, where (selector and a crop or the outlined capture), severity, fix pattern. Group by rule, most severe first. Count deterministic findings exactly; never estimate them.

## Swap

Follow [references/swap.md](references/swap.md). For each finding, open the fix pattern, apply its "Swap recipe" in the user's code, prefer the registry component when the pattern lists one, keep the user's brand colors and copy, then re run detect.js. A rule is fixed only when detect.js no longer reports it at both widths.

## Brand

Follow [references/brand.md](references/brand.md). Absorb the brand from the original with `brand_theme`, or ask for it
on a new site. Save the CSS as `theme.css` after the tokens, show the notes, and confirm color, typeface and logo with the
owner. Status dots for real outcomes use the theme's `--success` and `--danger`, flat and still.

## Rebuild

Follow [references/rebuild.md](references/rebuild.md). Diagnose the original, read its content with
`extract_content`, keep every heading, claim, action and owned image, map each section to a use and a pattern,
build it on tokens, then check the rebuild: zero measured findings at both widths and every original heading and
action still present. Flag unsourced numbers and testimonials to the user instead of rewriting them.

## Build

Follow [references/build.md](references/build.md). Choose the surface, list the uses the screen must serve in order, pick one pattern per use from the taxonomy, then compose. Run Diagnose on your own result before you show it.

## Icons

Every route that adds, keeps or swaps an icon goes through [data/patterns/icon-placement.md](data/patterns/icon-placement.md) first:
name the slot from `taxonomy.iconography.slots`, run its `test`, and only then pick a glyph from one set (line-icon-set,
the registry `icons/icon` component). Icons that fail the test are removed, not restyled. Logos and partner marks are the
identity slot and stay as the original files.

## Always

- Tokens only for color, spacing, radius and type. Start from `registry/src/tokens.css` or the user's existing tokens.
- Sentence case labels. No all caps with wide letter spacing (navigation labels are the one exception).
- Icons only where their slot needs one, from one set at one stroke weight. No emoji as icons or bullets, no long dashes in UI copy, no tinted pill badges, no thick colored left borders on cards, no purple gradient text, no glow on everything. The full list is the rules file; these are the ones people notice first.
- Real content beats placeholder: real product names, real numbers with a source, real images the user owns.
- Say what you checked and what you could not check. A clean detect.js run does not prove the design is good; it proves the listed tells are gone.
