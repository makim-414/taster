# AGENTS.md

Taster finds the AI generated look in a frontend and swaps it for patterns and components that do the job better.
This is the short guide for coding agents and contributors; [CONTRIBUTING.md](CONTRIBUTING.md) is the full one.

## Map

- `packages/engine/`: the CLI, the MCP server and the ACP agent, and `taster.mjs`, the one command of the npm package;
  runs `data/rules/detect.js` in a real browser
- `packages/registry/`: the React components, their tokens, the demo page and the preview stills
- `data/rules/`: `rules.json` and `detect.js`, the detector that measures them in the page, with fixtures
- `data/patterns/`: one Markdown file per pattern, listed in `data/patterns/INDEX.json`
- `data/taxonomy/`: categories with their decision key, uses, surfaces, weighting axes and constraints
- `apps/web/`: the hosted site
- `apps/extension/`: the Chrome and Edge extension
- `skills/taster/`: the skill; its `data/` folder is generated
- `commands/`: the `/taster` command for Claude Code
- `.claude-plugin/`, `.codex-plugin/`, `.mcp.json`: the plugin's own files, read when a user installs Taster as a
  Claude Code or Codex plugin. `.mcp.json` starts the engine from the installed copy through `${CLAUDE_PLUGIN_ROOT}`,
  which Claude Code sets only for an installed plugin. They are not a development setup for this repository; to run
  the engine while you work on it, use the commands in [CONTRIBUTING.md](CONTRIBUTING.md).
- `examples/`: a worked rebuild and the icon slot variations, each with its own check
- `scripts/`: build-docs, validate, gates and the metadata checks
- `.github/`: CI, issue templates, the code of conduct, the ACP registry entry and the pictures in the README
  (`.github/assets/`)

`packages/engine/`, `packages/registry/` and `apps/web/` are three npm packages, each with its own lockfile and
`npm ci --prefix <folder>`; there are no npm workspaces. The root `package.json` is the published package.

## Paths that stay where they are

Tools and settings outside this repository read these by path; moving or renaming one breaks them.

- `packages/engine/start.mjs`, `packages/engine/cli.mjs`: users' MCP client settings name
  `/path/to/taster/packages/engine/start.mjs` (README), and `.mcp.json`, `.codex-plugin/plugin.json` and `action.yml`
  start the engine by path.
- `.claude-plugin/`, `.codex-plugin/`, `.mcp.json`: the plugin manifests Claude Code and Codex read at the root, and
  `commands/`, where Claude Code finds the plugin's `/taster` command.
- `skills/taster/`: skill installers copy the folder whole, and `SKILL.md` links into its own `data/`.
- `action.yml`, `.nvmrc`, `packages/engine/package-lock.json`: an action lives at the root, installs the engine from
  that lockfile on the Node in `.nvmrc`, and users' workflows call it as `makim-414/taster@v0` or `@main`.
- `apps/web/`: Vercel builds the site from this folder (Root Directory `apps/web`); `apps/web/vercel.json` installs
  `../../packages/engine`.
- `data/patterns/<id>.md`: SARIF results (`packages/engine/sarif.mjs`) and the site link to
  `blob/main/data/patterns/<id>.md`, links that sit in users' code scanning alerts.
- `packages/registry/registry.json`, `packages/registry/stage/`, `packages/registry/previews/`: the site build, the MCP
  tools and the skill.
- `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `package.json`: names npm and GitHub look for.

## Generated files and checks

Generated files are never edited by hand ([CONTRIBUTING.md](CONTRIBUTING.md#where-things-live) lists them): edit the
source, run `node scripts/build-docs.mjs` (and `npm --prefix packages/registry run build-stage` after a component or
demo change), and commit the output with the change. A new generated path also gets a line in `.gitattributes`.

```bash
npm test                          # node scripts/gates.mjs: every CI job, in CI order
node scripts/gates.mjs validate   # one job: validate, browser, web or action
```

`node scripts/validate.mjs` rejects long dashes (U+2014, U+2013) and emoji in Markdown, JSON, code, CSS, HTML and
YAML files; an npx line for this package in a Markdown page while `package.json` is private (`RELEASING.md` and
`CHANGELOG.md` aside); links to `patterns/<id>.md` that are not in `data/patterns/INDEX.json`; and counts in prose
that differ from the data (the READMEs, `packages/registry/README.md`, `action.yml` and the package and plugin
descriptions).

## Commits

- English [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), one logical change per commit.
- Author and committer email: your GitHub noreply address. `node scripts/check-authors.mjs` fails on any other.
- No local paths, personal email addresses or names of private projects in files, commits or pull request text.
