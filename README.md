# Taster

Find the AI slop in a frontend, swap each spot for a pattern that does the same job better, or build a new screen
without it.

Taster is a skill and plugin for coding agents (Claude Code, Codex, Cursor and anything that reads `SKILL.md`).
It ships three things the agent uses together:

- **Rules.** Slop tells written down precisely enough to measure: all caps labels with wide letter spacing, tinted
  pill badges, thick colored left borders, emoji bullets, three identical icon cards in a row, Korean text that
  breaks mid word. Most are checked in a real browser by `rules/detect.js`.
- **A taxonomy of patterns.** Reusable design answers organized by what the visitor is trying to do (show one
  number, compare plans, prove trust, label a state) and where (landing, dashboard, app, store, editorial, sign in,
  AI chat). Every rule points to the patterns that fix it.
- **A registry of components.** Token based React components you copy into your app. No package to install, no
  brand to undo.

## What it does

Every session starts with one question: **is this a site that already exists, or are we building a new one?**
The answer picks the route.

| Route | You give it | You get back |
|---|---|---|
| Existing site, source in your workspace: Diagnose, then Swap | a URL or dev server, and the code | every slop spot outlined on a capture, then the same page with each spot replaced in your code, checked again until clean |
| Existing site, address only: Diagnose, then Rebuild | a URL (a hosted builder, a template, lost source) | the same words, links and brand on a new page made from patterns, checked clean and shown next to the original |
| New site: Build | a product, an audience, the kind of screen, your real content | a new screen composed from patterns, checked before you see it |

`examples/rebuild/` is a worked Rebuild: a generated looking landing page (17 rules hit) and its rebuild (0 at both
widths, every heading, action and nav item kept, brand color kept). `node engine/scripts/check-rebuild-example.mjs`
proves it.

## Install

Any agent that supports skills:

```bash
npx skills add https://github.com/makim-414/taster --skill taster
```

Claude Code plugin:

```text
/plugin marketplace add makim-414/taster
/plugin install taster@taster
```

Codex: the repository includes `.codex-plugin/plugin.json`.

MCP server (diagnose in a real browser, suggest swaps, fetch patterns and components). The Claude Code plugin
starts it for you. For any other MCP client, clone the repository and point the client at `engine/start.mjs`:

```bash
claude mcp add taster -- node /path/to/taster/engine/start.mjs
```

Command line, no agent needed:

```bash
npm --prefix engine install
node engine/cli.mjs https://example.com --out ./taster-report
node engine/cli.mjs https://example.com --extract    # the page's content, for a rebuild
```

It uses Playwright's Chromium if installed, otherwise your Google Chrome.

Then type `/taster` in Claude Code (or ask your agent to start Taster). It asks whether your site exists or is new
and takes it from there. You can also ask directly: "Diagnose this site for AI slop", "Rebuild my Lovable site
without the AI look", or "Build a pricing page for this product without generic AI patterns."

## Taxonomy at a glance

<!-- taxonomy:start -->
111 patterns, 66 rules, 44 components, 40 uses, 7 surfaces.

| Family | Categories | Patterns |
|---|---|---|
| Page sections | Hero, Feature section, Pricing, Call to action, Testimonial and proof, FAQ | 23 |
| Navigation | Navigation header, Footer, Sidebar, Command palette, Tabs and segmented control | 7 |
| Foundations | Layout and shell, Card, Typography, Icon and mark | 27 |
| Actions and inputs | Button, Form and input | 8 |
| Feedback and overlays | Badge and label, Toast and alert, Empty and error state, Loader and skeleton, Modal, drawer and menu | 13 |
| Data display | Chart and KPI, Table, Timeline and stepper, Map | 17 |
| Media, commerce and AI | Media and gallery, Commerce, Chat and AI | 11 |
| Motion and effects | Motion and particles, 3D scene | 5 |
<!-- taxonomy:end -->

## Repository

```text
skills/taster/      the skill (SKILL.md, references, and a generated data/ bundle)
taxonomy/            families, categories, uses, surfaces
patterns/            one Markdown file per pattern, plus INDEX.json
rules/               rules.json, detect.js (runs in the page), fixtures and tests
engine/              runs detect.js at two widths: CLI, MCP server (start prompt, diagnose, extract, swap tools), tests
examples/rebuild/    a worked Rebuild, before and after, with its own check
commands/            the /taster command for Claude Code
registry/            copyable React components, tokens, a demo page and a render test
scripts/             build-docs.mjs (derives links and the skill bundle), validate.mjs
```

Edit sources, then run:

```bash
node scripts/build-docs.mjs
node scripts/validate.mjs
node rules/test-detect.mjs
npm --prefix engine test
node engine/scripts/check-rebuild-example.mjs
npm --prefix registry run typecheck && node registry/test-render.mjs
```

## Principles

- Measure, then judge. A rule that can be computed from styles is computed, not guessed.
- Fix the token before the component. One accent color, neutral surfaces, hierarchy from size, weight and space.
- Real content over placeholders. No invented numbers, no fake testimonials.
- A clean detector run means the listed tells are gone, not that the design is good. The agent says what it could
  not check.

## License

MIT. Third party code carried in the registry is listed in `registry/THIRD_PARTY_NOTICES.md`.
