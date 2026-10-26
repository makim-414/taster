---
name: taster
description: Find and remove AI slop in frontends. Use when the user wants to check whether a site or screen looks AI generated, review a UI for generic patterns, replace slop with better components, or design and build a landing page, dashboard, app screen, store or editorial page that does not look generated. Triggers on "is my site slop", "does this look AI made", "de-slop", "make this less generic", "review this UI", "redesign this section", "build a landing page", "build a dashboard".
---

# Taster

Three jobs. Pick the one the user asked for; if unclear, start with Diagnose on whatever they showed you.

| Job | Input | Output |
|---|---|---|
| Diagnose | a URL, a running dev server, or a screenshot | every slop spot, marked on a capture, with the rule it breaks and the pattern that fixes it |
| Swap | a diagnosed page plus its source code | the same page with each spot replaced, re checked until clean |
| Build | a product, an audience and a surface | a new screen composed only from taxonomy patterns, checked before you hand it over |

Data this skill reads (all inside this folder):

- [data/rules.json](data/rules.json): the slop rules. `detect.level` says how each is checked: `deterministic` and `heuristic` rules run in the browser through [data/detect.js](data/detect.js); `manual` rules you judge from the capture.
- [data/taxonomy.json](data/taxonomy.json): families, categories, uses (what the end user is trying to do) and surfaces (landing, dashboard, app, commerce, editorial, auth-onboarding, ai-chat).
- [data/patterns/INDEX.json](data/patterns/INDEX.json) and `data/patterns/<id>.md`: one reusable design answer per file. Every rule lists its fix patterns in `fix_patterns`.
- [data/registry.json](data/registry.json): token based React components you can copy. Source lives in the repository under `registry/src/`; if this folder was installed alone, fetch the file from `https://raw.githubusercontent.com/makim-414/taster/main/registry/<file>`.

## If the taster MCP server is connected

Prefer its tools; they run the same detector in a real browser for you.

- `diagnose { target }`: findings grouped by rule plus one outlined capture per width (1440 and 390).
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

## Build

Follow [references/build.md](references/build.md). Choose the surface, list the uses the screen must serve in order, pick one pattern per use from the taxonomy, then compose. Run Diagnose on your own result before you show it.

## Always

- Tokens only for color, spacing, radius and type. Start from `registry/src/tokens.css` or the user's existing tokens.
- Sentence case labels. No all caps with wide letter spacing (navigation labels are the one exception).
- No emoji as icons or bullets, no long dashes in UI copy, no tinted pill badges, no thick colored left borders on cards, no purple gradient text, no glow on everything. The full list is the rules file; these are the ones people notice first.
- Real content beats placeholder: real product names, real numbers with a source, real images the user owns.
- Say what you checked and what you could not check. A clean detect.js run does not prove the design is good; it proves the listed tells are gone.
