# Changelog

All notable changes to Taster are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `add` fits the components to an app that has its own Tailwind theme (a v4 `@theme` in its CSS, or a v3
  `tailwind.config`), so the app looks the same after it (`packages/engine/fit.mjs`). Before, the copy brought
  `tokens.css` and the v3 preset, which redefine names such an app has already (`--accent`, `--border`, `--radius`,
  `rounded-lg`, `ease-out`), and an agent skipped them and renamed classes by hand. Now `add` reads the app's Tailwind
  version and tokens without running its config, and rewrites each Taster token class to the app's class that plays
  the same part (`bg-accent` to `bg-brand` when the app's `accent` is a highlight, `text-text-muted` to
  `text-ink-muted`, text on the brand to the app color with the best contrast on it) or to the stock class of the same
  value (`text-h2` to `text-2xl`, `font-med` to `font-medium`). The rest moves under a `tst-` prefix, every custom
  property the components read is renamed `--tst-*`, and one generated `taster.css` (plus an extend-only
  `taster-tailwind.cjs` for v3) defines only `tst-` names, pointing at the app's tokens where they map. It prints each
  mapping and the one line to add. `--tokens taster` keeps the old copy; an app with no theme of its own gets it by
  default.
- `add` sends every icon of the copied files through one adapter to the app's own set. It finds `lucide-react` or
  Heroicons imported in the app's code, or a local icons file, and the stroke the app draws them at, writes
  `icons/index.tsx` so `Icon` draws the app's glyph for each name it can match (Taster's glyph at the app's stroke for
  the rest), and points every icon drawn inline in the copied files at its `ICON_STROKE`, so the page keeps one stroke
  weight (ICO-03). It says so in its output; changing sets is an edit to that one file.
- `suggest_swaps` answers for a page with no findings: `ruleIds` may be empty, with `sections`, the page's own
  sections in order by name or heading, and the answer gives each section's taxonomy category, the registry parts for
  it and the `browse_components` call to show them (the usual landing order without `sections`). A diagnose with no
  findings says so in its first line. Before, the tool needed a rule id, and an agent passed ids from an earlier report.

- `taster watch`, a live viewer: a local page that draws what agents do with Taster while they do it. Start it in a
  second terminal (`node packages/engine/taster.mjs watch`, or `start.mjs watch` for a plugin install) and open the
  address it prints. The local MCP server, the ACP agent and the CLI then report each call (`packages/engine/live.mjs`,
  a no-op while no hub runs), and the page shows a clean picture of each diagnosed page with a mark on every finding at
  its real rect, and a cursor per agent that flies to the findings, swaps, components, token changes and plan steps.
  After a component add, a token tune or a plan check, a local page is opened again until it changes, and the marks
  whose rules are gone turn resolved. Detection is one pass, so the visiting order (the 30 most severe findings, top to
  bottom) is the viewer's own, and it says so. The hub listens on 127.0.0.1 only, checks Host and Origin, needs a token
  to report and a key to read ([SECURITY.md](SECURITY.md#live-viewer-taster-watch)).
  `detectOnce` takes a `stageShot` option for the clean picture. `check-live-viewer.mjs` runs in the browser job.
- The live viewer shows the page change edit by edit. The plugin adds a Claude Code PostToolUse hook
  (`hooks/hooks.json`, on Edit, Write, MultiEdit and NotebookEdit) that runs `taster live edit`, which tells a running
  `taster watch` which file changed; other agents call `taster live edit --file <path> --client <name>`, and `add`
  reports the files it wrote. With no hub it returns at once without reading its input and always exits 0. On each
  edit the hub loads the local page again once the dev server has reloaded, compares its elements (path, rect, own
  text and visible computed styles) with the load before, and sends `stage.patch` with the regions that changed and
  the findings of the new load. The editing agent's cursor flies to each region, draws its box and size, and only that
  region crossfades to the new picture; findings that are gone resolve there and the count goes down edit by edit.
  The regions come from that comparison after the reload, not from tracing the edit to elements; edits that land
  between two loads are matched to regions by file name and marked as a guess. `detectOnce` takes a `domShot` option.
- The per-edit view ignores what changes by itself. Right after a diagnose the hub loads the page 3 times with no
  edit, and elements that differ between those loads (a rotating word, a clock, a ticker, a random chart) are left out
  of every edit's regions (`changedKeys`, and `diffSnapshots` takes `ignore`). On a page whose picture never repeats
  (WebGL, video) the hub keeps loading until the elements change, instead of taking the moving picture as the reload:
  before, such a page sent its patch before the dev server had rebuilt, and the change landed on the next edit.
- 8 components, for 152 in the registry, written new after picks on 21st.dev with no code taken: `scene/noise-orb`
  and `scene/ridge-terrain` (a wire sphere and a low-poly terrain), `motion/lamp-glow` and `motion/band-shader` (a
  section lamp in CSS and light slats in one WebGL1 shader), `blocks/password-field` (strength bar and checklist on
  `sensitive-input`), `blocks/location-expand` (a place card that opens into a map), `marketing/index-testimonial`
  and `marketing/topo-hero`.
- The site has a `/demo` page: the worked rebuild in `examples/rebuild/` rebuilt by a swarm of agents. A diagnose crew
  flies out at once to what the detector finds on the original (at 1300 and 390 wide), outlines each element and pins
  its rules while the count climbs to 18. A rebuild crew of 6 to 24 agents then builds the rebuilt page layer by layer
  from its real DOM (each box and each line of text, in document order): an agent flies to the layer, draws it with
  its size, and the layer shows or its text types in. A floating bar shows the agents, the layers done, a progress
  line, 1x or 2x, pause and replay. A system cursor then drags the radius and spacing tokens and the whole page
  restyles, and the end card says how many agents took how long and that the rules went from 18 to 0, with a link to
  the rebuilt page. Reduced motion shows the end state. The home page links to it under the before and after slider.
- The demo's cursor curves and arrow come from Stageshow (MIT, credited in `THIRD_PARTY_NOTICES.md`).
- `apps/web/scripts/demo/record.mjs` records the same demo on any before and after page you can open, to a local
  video (`--before`, `--after`, `--out` outside the repository).
- The worked rebuild in `examples/rebuild/` has a light mode: when the visitor's system asks for light, `site.css`
  loads `light/theme.css`, the light scheme of the same design system (same brand and tone). Dark stays the default, so
  the README and slider pictures do not change (`apps/web/scripts/compare/render.mjs` now asks for dark). It passes
  CMP-11 (dark only) where every stylesheet is readable, as on `/demo`, which now ends at 17 rules to 0 at 1300 wide.
  `check-rebuild-example.mjs` checks both modes: 0 findings at 1440 and 390, and 0 drift and 0 off-system values.
  `diagnose()` and `checkConsistency()` in the engine take a `colorScheme` option for that.

### Changed

- **Breaking:** a new repository layout, the `apps/` and `packages/` shape most JavaScript monorepos use. The engine
  (CLI, MCP server, ACP agent) moved from `engine/` to `packages/engine/`, and `bin/taster.mjs` is now
  `packages/engine/taster.mjs`. The registry moved from `registry/` to `packages/registry/`, the site and the extension
  from `web/` and `extension/` to `apps/web/` and `apps/extension/`, the rules, patterns and taxonomy from `rules/`,
  `patterns/` and `taxonomy/` to `data/rules/`, `data/patterns/` and `data/taxonomy/`, and the README pictures from
  `assets/` to `.github/assets/`. The engine, the registry and the site are still three npm packages with their own
  lockfiles. What to change on your side:
  - An MCP or ACP client that starts `/path/to/taster/engine/start.mjs` now starts
    `/path/to/taster/packages/engine/start.mjs`, and `npm ci --prefix /path/to/taster/engine` is
    `npm ci --prefix /path/to/taster/packages/engine`. The Claude Code and Codex plugins start the new path themselves.
  - The command line in a clone is `node packages/engine/cli.mjs` (or `node packages/engine/taster.mjs`).
  - An extension loaded unpacked from `extension/` is loaded again from `apps/extension/`.
  - Pattern help links in SARIF results written before this change point at `blob/main/patterns/<id>.md`, which is
    gone; new results link to `blob/main/data/patterns/<id>.md`.
  - Workflows on the GitHub Action need no change. `makim-414/taster@v0` points at the 0.2.0 tree until the next
    release moves the tag to the new layout, and `@main` runs the new layout once this is merged; the inputs are the
    same.
- The npm package no longer lists the extension in its files; it is installed unpacked or from the store.
- The README says what each install path gives and needs: the plugin (the skill, `/taster` and the local MCP server
  in one step, now with the `claude plugin` terminal commands), the skill alone (the rules, patterns and in-page
  detector) and a clone.
- The READMEs and `packages/registry/README.md` say the components need Tailwind with the Taster preset, with the
  config for Tailwind v3 and v4, and warn that an app stylesheet redefining `--bg`, `--text`, `--border` or `--accent`
  after `tokens.css` wins.
- `add` ends with that Tailwind setup and the `:root` warning instead of a one line pointer to the preset.
- The component pages on the site show every step: clone the repository and install the engine, run `add` from the
  app folder, and connect the preset; the packages row lists `tailwindcss`.
- Installed alone, the skill says where the engine comes from (the plugin, the hosted MCP server at
  `https://taster-six.vercel.app/api/mcp`, or a clone) and writes its commands as `node <clone>/packages/engine/...`.
- `/taster <url>` (or a local address or a page file) goes straight to Diagnose instead of asking whether the site
  already exists or is new: a URL or file is an existing site. The skill, its start guide and the MCP `start` prompt
  ask the opening question only when the first message gives neither and does not say which. The question whether
  the site is theirs or they may use it now comes before Brand and Rebuild, which take from the site, not before the
  diagnosis, which only reads it.
- The MCP `diagnose` answers with a summary: per rule its id, name, severity, counts per width, up to 3 example
  selectors and its fix patterns, with the totals and the manual rules. On a real landing page the full answer ran to
  about 210,000 characters, past what Claude Code takes as one tool answer, so the agent had to read it from a file;
  the summary of the same page is about 10,000, and it stays under 16,000 however many findings a page has
  (`compactReport` in the engine). The local server saves every finding to `report.json` next to the captures and
  names both paths; the new `get_findings { report, rule, width, offset, limit }` reads one rule's findings from it
  without opening the page again. `rules: [ids]` puts those rules' findings in the answer and `detail: "full"` all of
  them, on the hosted server too.

### Fixed

- BG-01 no longer reports a cursor spotlight drawn on a card's edge as an aurora background. Such a gradient border
  masks a radial gradient to the padding ring (two mask layers composited with `exclude`, one clipped to the content
  box), so it paints a 1px line, yet the rule measured the whole card against the viewport and flagged every card of
  a page on a phone. The rule now measures only the painted ring when the element is masked that way.
- RSP-04 no longer reports a label cut by its own `text-overflow: ellipsis` as overlapping the label next to it. The
  text was clipped to its ancestors' boxes but not to its own, so the hidden tail of a truncated title in a flex row
  counted as overlapping the badge beside it.
- The ACP agent ends a cancelled tool call. After `session/cancel` the running `/diagnose` or `/brand` tool call was
  left `in_progress`, so an editor showed it running for the rest of the session; it now gets a last
  `tool_call_update` with status `failed` ("Cancelled.") before the turn answers `cancelled`. The run that goes on in
  the background no longer reaches `taster watch` either: a call sends nothing after its `call.end`
  (`packages/engine/live.mjs`), where the viewer used to draw the cancelled run's page and findings.

- `/start <url or file>` in the ACP agent diagnoses it at once, as the MCP `start` prompt does, instead of asking the
  opening question about a site the user just named, and `/taster` is the same command, since that is what the skill
  is called in other agents. An editor user typing `/taster http://localhost:5173` got "Unknown command".

- `brand_theme` and `--brand` no longer take an accent for the brand. On a landing whose `--color-brand` dark green
  was on the logo, the highlights and the focus ring, the lime accent that filled more buttons came back as the
  brand. The brand color is now read strongest evidence first: a CSS custom property named for the brand or primary
  color (`--brand`, `--color-brand`, `--primary`, `--color-primary`, and their main shade), resolved the way the page
  draws it (bare hsl channels too); then the color of the logo mark and of the focus ring; then, as before, the most
  used saturated color on buttons and links. A neutral token is skipped. `brand.colorFrom` (and `source.colorFrom`)
  says which one was used, and the note names it without quoting the page.

- After `add`, an agent wired the components into the page with a python heredoc, which asks the user for permission
  and bypasses the live viewer's edit hook. `add` now ends with the import line and the JSX for each component, its
  required props and the shape of their types, written for `--into` (default `src/App.tsx`), and says to place them
  with the Edit tool, one file per edit. `get_component` and `suggest_swaps` say the same, `get_component` with the exact
  `add` command since its code is in Taster's own token names, and the skill says it under Always and in the swap
  steps. `add` reports every file it writes to the live viewer as one edit, `taster.css` and the icon adapter included.
- `useInViewOnce` and `useToc` take `RefObject<T | null>`, so a copied `marketing/pricing-cards` passes `tsc` in a
  React 19 app, where `useRef<T>(null)` is typed that way. Types only; the stage page is the same.

- The live hub no longer goes quiet when the page breaks after an edit. When the stage answers with an HTTP error
  (a 5xx while the dev server shows its error page) or does not load at all, it stops retrying once the same error
  comes back twice, instead of loading it up to 4 times at up to 30 seconds each, about 100 seconds of silence on a
  real page, and sends `stage.error` with the status, a short message and the edit before it. The viewer shows it as
  a line over the stage and a failed line in the log, cleared by the next good load, and the fix is compared with the
  last load that worked. `engineRefresher` answers such a load with `{ error }` instead of null.
- An edit with no visible change no longer holds up the next one in the live hub. It ran its whole retry window
  (about 10 seconds on a real page) while the next edit waited, and the next edit's change, landing during those
  retries, was shown for the first edit's file. Now a newer edit ends that wait: the first edit gets a `stage.patch`
  with no change and `superseded: true` ("no visible change before the next edit" in the viewer), and the change goes
  to the newer edit. An edit that comes in while the load showing a change runs joins that patch, and its regions are
  matched to the edits by file name.
- The skill no longer tells the agent to download missing component files from the main branch at run time; the code
  comes from `get_component` or from `add` in a clone.
- `lint` no longer reports the second line of a custom property value that a formatter split over lines
  (`--shadow:` and then `rgba(...) ...;`), so the starter stylesheet of a new Vite app passes.

### Removed

- The plugin's `commands/taster.md`, which never ran because the skill of the same name answers `/taster`; `/taster`
  still starts the skill.

### Fixed

- The GitHub Action gives the Linux system packages and fonts five minutes to install and only warns when the package
  mirror does not answer, instead of failing the job after twenty minutes; the diagnosis still fails if no browser
  starts.
- Hosted diagnosis no longer stops working after a heavy page: each server browser runs in its own temp folder, and the
  files a crashed browser leaves, its core dump included, are removed before the next run.

## [0.2.0] - 2026-11-06

The first tagged release (`v0.2.0`, and `v0` for the GitHub Action).

### Added

- A strict taxonomy (`taxonomy/`, [SCHEMA.md](data/taxonomy/SCHEMA.md)): 33 categories in 8 families, a decision key over
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
- Repository layout: the code of conduct is now `.github/CODE_OF_CONDUCT.md`, `RELEASE.md` is `RELEASING.md`, the
  ACP registry entry is in `.github/acp-registry/taster/` (`distribution/` is gone) and the README pictures are in
  `assets/` (`docs/` is gone). Old links to `CODE_OF_CONDUCT.md` and `RELEASE.md` at the root now return 404. A new
  `AGENTS.md` tells coding agents which paths not to move.
- `exports/` is no longer committed. `taster export` writes the instruction files into a project as before, and each
  release attaches all seven as `taster-exports-<version>.zip` (`node scripts/build-exports.mjs` writes the folder).
  Raw links to files under `exports/` on `main` now return 404.

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

The first public version, never tagged. It covers everything merged up to this date.

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
