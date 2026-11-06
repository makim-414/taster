# AGENTS.md

Taster finds the AI generated look in a frontend and swaps it for patterns and components that do the job better.
This is the short guide for coding agents and contributors; [CONTRIBUTING.md](CONTRIBUTING.md) is the full one.

## Map

- `engine/`: the CLI, the MCP server and the ACP agent; runs `rules/detect.js` in a real browser
- `rules/`: `rules.json` and `detect.js`, the detector that measures them in the page, with fixtures
- `patterns/`: one Markdown file per pattern, listed in `patterns/INDEX.json`
- `taxonomy/`: categories with their decision key, uses, surfaces, weighting axes and constraints
- `registry/`: the React components, their tokens, the demo page and the preview stills
- `skills/taster/`: the skill; its `data/` folder is generated
- `web/`: the hosted site
- `extension/`: the Chrome and Edge extension
- `bin/`: the one command of the npm package
- `commands/`: the `/taster` command for Claude Code
- `examples/`: a worked rebuild and the icon slot variations, each with its own check
- `scripts/`: build-docs, validate, gates and the metadata checks
- `assets/`: the pictures in the README
- `.github/`: CI, issue templates, the code of conduct and the ACP registry entry

## Paths that stay where they are

Tools and settings outside this repository read these by path; moving or renaming one breaks them.

- `engine/start.mjs`, `engine/cli.mjs`: users' MCP client settings name `/path/to/taster/engine/start.mjs` (README),
  and `.mcp.json`, `.codex-plugin/plugin.json` and `action.yml` start the engine by path.
- `.claude-plugin/`, `.codex-plugin/`, `.mcp.json`: the plugin manifests Claude Code and Codex read at the root.
- `skills/taster/`: skill installers copy the folder whole, and `SKILL.md` links into its own `data/`.
- `action.yml`, `.nvmrc`, `engine/package-lock.json`: an action lives at the root, installs the engine from that
  lockfile on the Node in `.nvmrc`, and users' workflows call it as `makim-414/taster@v0` or `@main`.
- `web/`: Vercel builds the site from this folder; `web/vercel.json` installs `../engine`.
- `patterns/<id>.md`: SARIF results (`engine/sarif.mjs`) and the site link to `blob/main/patterns/<id>.md`, links that
  already sit in users' code scanning alerts.
- `registry/registry.json`, `registry/stage/`, `registry/previews/`: the site build, the MCP tools and the skill.
- `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `package.json`: names npm and GitHub look for.

## Generated files and checks

Generated files are never edited by hand ([CONTRIBUTING.md](CONTRIBUTING.md#where-things-live) lists them): edit the
source, run `node scripts/build-docs.mjs` (and `npm --prefix registry run build-stage` after a component or demo
change), and commit the output with the change. A new generated path also gets a line in `.gitattributes`.

```bash
npm test                          # node scripts/gates.mjs: every CI job, in CI order
node scripts/gates.mjs validate   # one job: validate, browser, web or action
```

`node scripts/validate.mjs` rejects long dashes (U+2014, U+2013) and emoji in Markdown, JSON, code, CSS, HTML and
YAML files; an npx line for this package in a Markdown page while `package.json` is private (`RELEASING.md` and
`CHANGELOG.md` aside); links to `patterns/<id>.md` that are not in `patterns/INDEX.json`; and counts in prose that
differ from the data (the READMEs, `registry/README.md`, `action.yml` and the package and plugin descriptions).

## Commits

- English [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), one logical change per commit.
- Author and committer email: your GitHub noreply address. `node scripts/check-authors.mjs` fails on any other.
- No local paths, personal email addresses or names of private projects in files, commits or pull request text.
