# Contributing to Taster

Thanks for helping. This guide covers setup, the checks every change passes before it is merged, and the rules for
code and pictures that come from somewhere else. Everyone taking part follows the
[Code of Conduct](.github/CODE_OF_CONDUCT.md). Security problems go through [SECURITY.md](SECURITY.md), never a
public issue.

## Before you start

- A bug: open a [bug report](https://github.com/makim-414/taster/issues/new?template=bug.yml).
- A new rule, or a change to what a rule flags: open a
  [rule proposal](https://github.com/makim-414/taster/issues/new?template=rule-proposal.yml) first. A rule needs a
  source that says it (quote the sentence), a page that should be flagged and a page that should not.
- A larger change (a new tool, a new route, a change to the taxonomy): open an issue to agree on the shape before
  writing the code.

## Set up

Node 22 (CI runs 22; the web app needs 22.17.0 or later) and git.

```bash
git clone https://github.com/makim-414/taster.git
cd taster
npm ci --prefix engine
npm ci --prefix registry
npm ci --prefix web
npx --prefix engine playwright install chromium    # on Linux, add --with-deps
```

The browser checks use the Chromium installed above, the same build CI uses. Set `CHROME_PATH` to use another
build.

## Where things live

| Folder | What it holds |
|---|---|
| `data/rules/` | `rules.json`, the detector `detect.js` that measures them in the page, fixtures and their test |
| `data/patterns/` | one Markdown file per pattern, listed in `data/patterns/INDEX.json` |
| `data/taxonomy/` | categories and their decision key, uses, surfaces, weighting axes and constraints ([SCHEMA.md](data/taxonomy/SCHEMA.md)) |
| `packages/registry/` | the components, their tokens, the demo page and the stills ([README](packages/registry/README.md)) |
| `packages/engine/` | the CLI, the MCP server and the ACP agent ([README](packages/engine/README.md)) |
| `apps/web/` | the hosted site ([README](apps/web/README.md)) |
| `skills/taster/` | the skill; its `data/` folder is generated |

Some files are generated. Do not edit them by hand; edit the source and run the build:

- `node scripts/build-docs.mjs` writes `rules/RULES.md`, `patterns/README.md`, the taxonomy block in `README.md`,
  the rules block in both READMEs, the descriptions in `package.json`, `extension/manifest.json`,
  `.github/acp-registry/taster/agent.json` and the two plugin manifests (`scripts/check-meta.mjs` lists them),
  `extension/detect.js`, `extension/rules.js`, `registry/src/motion/orb-recipes.ts`,
  `skills/taster/data/`, and the derived fields `fix_patterns` in `rules/rules.json`, `patterns` in
  `registry/registry.json` and `gaps` in `taxonomy/taxonomy.json`.
- `npm --prefix registry run build-stage` writes `registry/stage/` and `registry/previews/`. Run it after changing a
  component or its demo; `node scripts/validate.mjs` fails until you do.
- `node web/scripts/readme/render.mjs` writes the pictures for the repository page: `assets/social-preview.png`
  (uploaded by hand under Settings, Social preview) and `assets/components.dark.jpg` and
  `assets/components.light.jpg`. Run it after changing the card's sentence or one of the six component stills it
  reads from `registry/previews/` (the list is in the script).

Commit the generated files together with the change that caused them. `.gitattributes` marks the generated paths
`linguist-generated`, so GitHub folds them in pull request diffs and leaves them out of the language bar; add a line
there when a build starts writing a new file.

## Checks

Run these before you open a pull request:

```bash
node scripts/gates.mjs               # every job below, in order (npm test runs the same); installs what is missing first
node scripts/gates.mjs web           # one job: validate, browser, web or action
```

They are the same steps, in the same order, as the four CI jobs in `.github/workflows/validate.yml`
(`scripts/gates.test.mjs` keeps the two in step). One by one:

```bash
# validate
node scripts/build-docs.mjs                        # then git status: nothing may change
node scripts/validate.mjs
node scripts/check-taxonomy.mjs
node --test taxonomy/axes.test.mjs
node engine/scripts/check-rules.mjs
npm --prefix registry run typecheck
node engine/lint.mjs --selftest
node engine/lint.mjs registry/src --baseline registry/lint-baseline.json
node --test scripts/check-authors.test.mjs scripts/gates.test.mjs
node scripts/check-authors.mjs                     # the commits on your branch use a GitHub noreply email

# browser
node rules/test-detect.mjs
npm --prefix engine test
node engine/scripts/check-rebuild-example.mjs
node engine/scripts/check-icon-slots-example.mjs
npm --prefix registry run test-render              # builds the demo, renders every component at 1440 and 390
node registry/test-a11y.mjs                        # keyboard focus, accessible names, reduced motion
node registry/test-injection.mjs

# web
npm --prefix web run build                         # type-checks too
node web/scripts/check-traces.mjs
npm --prefix web test
npm --prefix web start &                           # serves the build on http://localhost:3240 ($PORT to change)
node web/scripts/self-check.mjs
node web/scripts/check-gallery.mjs
node web/scripts/check-tone.mjs
node web/scripts/check-metadata.mjs
node web/scripts/check-a11y.mjs
# then stop the server
```

The five browser scripts take a base address. If port 3240 is busy, start the build with
`PORT=3250 npm --prefix web start` and pass `http://localhost:3250` to each (or set `BASE_URL`); `gates.mjs` picks a
free port itself. `self-check` allows only the findings listed, with a reason, in `web/scripts/self-check-baseline.json`;
`check-a11y` allows only the counts in `web/scripts/a11y-baseline.json`, which may only go down
(`node web/scripts/check-a11y.mjs --write-baseline` after a fix).

The fourth job, `action`, runs this repository's GitHub Action on `examples/rebuild/` on Linux and macOS. The same
diagnosis locally:

```bash
node engine/cli.mjs examples/rebuild/before.html examples/rebuild/after.html --sarif taster.sarif --fail-on none
```

## Rules the repository holds itself to

Taster checks its own pages and text, so a change has to pass the rules it ships.

- No long dashes and no emoji in any Markdown, JSON, code, CSS, HTML or YAML file. `node scripts/validate.mjs`
  rejects both.
- A relative link or picture in Markdown points at a file or folder that exists, in the same letter case. When you
  move a file, `node scripts/validate.mjs` names every page and line that still links the old path.
- Colors, spacing, radii and type come from the tokens in `registry/src/tokens.css`, never hard-coded values.
- No labels in capitals with wide letter spacing, no tinted pill badges, no rows of three identical icon cards: the
  detector flags them in our own pages too (`node web/scripts/self-check.mjs`).
- A change to a screen keeps it free of findings and of horizontal scroll at 390 and 1280 wide.

## Code, pictures and text from elsewhere

- If you cannot confirm the license of code you want to use, do not copy it. Write the component yourself and put
  the link in the pattern's `inspiration` frontmatter.
- If you copy or adapt code under a compatible license, keep its copyright notice, add a header line in the file
  (`// Upstream license: MIT, Copyright (c) <year> <holder>. Full text in THIRD_PARTY_NOTICES.md.`), set the
  component's `credit` in `registry/registry.json`, and add the source and its full license text to
  `registry/THIRD_PARTY_NOTICES.md`. The steps for redrawing a component are in
  [packages/registry/README.md](packages/registry/README.md#bringing-in-a-component-from-elsewhere).
- Do not commit screenshots or captures of other people's sites, apps or products, or logos and wordmarks you do not
  own. Pictures in the repository are renders of Taster's own components, or images you made and can license under
  MIT. A font file comes with its license file.
- Rules describe patterns, not people or companies. Do not call another company's site or product slop, in code,
  docs, fixtures, issues or pull requests. Fixtures are pages written for the test, not copies of real sites.
- Code that opens other people's sites never gets past bot checks, CAPTCHAs or sign in walls, and on a cookie banner
  it only ever declines.

## Commits and pull requests

- Commit messages and pull request titles are in English and follow
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): summary`, for example
  `fix(engine): read the heading face across h1 to h3`. Types in use: `feat`, `fix`, `docs`, `test`, `chore`, `ci`,
  `refactor`. Scopes in use: `engine`, `registry`, `web`, `rules`, `patterns`, `skill`, `taxonomy`, `examples`,
  `demo`.
- One logical change per commit. Keep renames apart from behavior changes, and tooling apart from features.
- Add a line under `Unreleased` in [CHANGELOG.md](CHANGELOG.md) for anything a user would notice.
- Commit messages, pull request text and files carry no local paths (home or temporary folders), no personal email
  addresses and no names of private projects, clients or companies. Your commit author email is public; use your
  GitHub noreply address if you do not want yours shown.
- Pull requests go to `main` and are merged once CI is green. Nobody pushes to `main` directly.

## License

Taster is under the [MIT License](LICENSE). By contributing, you agree that your contribution is licensed under the
same terms.
