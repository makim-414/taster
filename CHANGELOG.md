# Changelog

All notable changes to Taster are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A strict taxonomy (`taxonomy/`, [SCHEMA.md](taxonomy/SCHEMA.md)): 33 categories in 8 families, a decision key over
  33 yes or no features that gives every UI part exactly one category, eight weighting axes (density, contrast,
  roundness, type expression, color restraint, elevation, motion, stroke) on named steps, and 10 design constraints
  that keep the axes balanced.
- A design system engine: the MCP tools `design_system`, `tune_system` and `system_for_category`, and the CLI options
  `--system` and `--tune`. It measures the brand site and reference pages in a real browser and writes
  `taster.system.json` and a `theme.css` with every token the axes drive.
- Screen by screen work: `check_consistency` reports the same component drawn differently on two screens and any value
  that is not one of the system's tokens; `plan_screens`, `plan_next` and `plan_update` keep the order in
  `taster.plan.json`, and its accept step records the exceptions the builder approved. CLI options `--consistency`
  and `--plan`.
- 79 components, for 144 in the registry: app side components, page sections, content and typography, media and
  commerce, chat, motion and a 3D scene.
- On-scrim text tokens for type set over photos.
- A second screen in `examples/rebuild/`, built from the same components and checked consistent with the first, and
  the rebuild example now wears the design system made from its original.
- Guidance from Taster's own screens in eighteen patterns and in the engine and registry READMEs.
- `THIRD_PARTY_NOTICES.md` at the root lists the third party code in the repository (registry and web) and where each
  license text lives.
- `node scripts/gates.mjs` runs every gate CI runs, in the same order, from a clean clone; `CONTRIBUTING.md` lists
  them one by one.
- A "Where the rules come from" section in both READMEs, written by `scripts/build-docs.mjs` from each rule's `basis`
  and refs, and a privacy section for the hosted site.

### Changed

- The skill's route is Diagnose, Brand and references, System, Screens.
- A logo face that a system declares as `identity.logoFont` is exempt inside the logo and reported apart.
- Registry spacing, type sizes and weights read the tokens.
- The web app carries the Noto Sans KR files it uses, with their OFL license, instead of fetching them at build.
- MCP results, breaking for a client that parses them: what a page says (the report of `diagnose`, the content of
  `extract_content`, the page values in `brand_theme`) now comes inside an `<untrusted_page_content>` block, and the
  first content item is a sentence from Taster. A client that ran `JSON.parse` on the first text item reads the JSON
  inside the block instead.
- A page that answers with a bot check, a block or error page, or a sign-in page on another host is reported as not
  diagnosed, with no findings: an MCP error that starts with `not diagnosed`, exit code 2 from the CLI and the GitHub
  Action, and a notice in the SARIF.
- Breaking for code that uses these registry components: `BarChart`, `Sparkline` and `Progress` need a `label`,
  `aria-label` or `aria-labelledby`, and `PopoverContent` an `aria-label` or `aria-labelledby`; without one,
  TypeScript reports an error.
- The hosted MCP server takes one JSON-RPC message per request (a batch gets 400), counts every tool call against a
  per client minute and answers with an error instead of anything over 4 MB. Its limits, like those of the other
  hosted routes, are kept by each server instance on its own.

### Fixed

- The GitHub Action's branding color is `gray-dark` (`gray` is not one GitHub accepts), and its Marketplace name is
  `Taster Slop Check`, because a name equal to an existing GitHub account cannot be listed. `uses:` lines do not
  change.
- The README install lines work before the npm package is published: the lint and component lines run the clone's
  CLI by its path from the app folder, so `--dir` lands inside the app.

- AC-09 skips text inside form fields and code editors.
- The light theme has its own sidebar surface.
- The engine reads a transparent page background as the canvas instead of black, reads the heading face across h1 to
  h3 with the logo face apart, and takes the body face from main text instead of a header paragraph.
- The web pages each have their own link preview and canonical address, the board's no longer points at the home
  page, and the preview picture counts the measured rules apart from the total. A missing page shows Taster's own 404
  screen. `/robots.txt` and `/sitemap.xml` exist, and every response carries a content security policy and a
  permissions policy.
- A component page's install line works from inside your app (`--from` the hosted site), and its English summary is
  marked as English.
- The bookmarklet's files live in a folder named after their hash, so the browser can keep them for good without
  ever running an old copy against a new bookmark. The bookmark holds the overlay's sha384 and the overlay those of
  the detector and the rule names, so a click runs only the files it was made with, and the requests send no Referer.
  A bookmarklet saved before this change still loads the unpinned `/taster/overlay.js` and sends that first request
  with a Referer: drag it from `/bookmarklet` again.
- The READMEs: working MCP setups for Codex and Cursor, the requirements, what the local tools can reach, the hosted
  server's tools as they are, and the number of rules the rebuild example breaks, which
  `engine/scripts/check-rebuild-example.mjs` now checks. The Korean README has every section of the English one.
- The GitHub Action runs on macOS runners too (it read its targets with `mapfile`, which the bash on macOS lacks),
  pins the actions it uses to a commit, and installs Chromium's system packages only when the runner lacks them.

## [0.1.0] - 2026-11-02

The first public version. It has no tag yet and covers everything merged up to this date.

### Added

- The Taster skill for coding agents (`skills/taster/`). One opening question picks the route: Diagnose then Swap,
  Diagnose then Rebuild, or Build. Every route turns the site's color, typeface and logo into a token theme.
- 80 rules, 77 of them measured in a real browser by `rules/detect.js` and 3 judged by eye, each pointing to the
  patterns that fix it.
- 119 patterns organized by what the visitor is trying to do and where, in 40 uses and 8 surfaces.
- 65 token based React components in the registry, and `add`, which copies a component with every file it imports
  and the token files.
- The engine: a CLI, an MCP server (`diagnose`, `extract_content`, `brand_theme`, `browse_components`,
  `preview_component`, `suggest_swaps`, `list_patterns`, `get_pattern`, `get_component`, `taxonomy`, `list_rules`,
  `explain_rule`) and an ACP agent for editors.
- Source lint (`lint`) for the code form of the rules, with a baseline that lets counts only go down and
  `taster-allow <reason>` for single lines.
- The rules exported as instruction files for agents without MCP (AGENTS.md, Claude Code, Cursor, Windsurf, Cline,
  GitHub Copilot and Gemini CLI).
- A GitHub Action that writes findings to the job summary and as SARIF.
- A bookmarklet and a Chrome or Edge extension that outline the findings on the page you are viewing.
- The hosted site at https://taster-six.vercel.app: diagnosis of a public address, the component gallery and board,
  and the hosted MCP server at `/api/mcp`.
- Plugin manifests for Claude Code (`.claude-plugin/`) and Codex (`.codex-plugin/`).
