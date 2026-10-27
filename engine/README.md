# engine

Runs the slop detector (`rules/detect.js`) in a real Chromium at 1440 and 390 wide, writes an annotated capture per width, and serves the same thing to agents over MCP.

`rules/detect.js` has no dependencies. Any browser tool can load it into a page and call `window.tasterDetect({ highlight: true })`, as `skills/taster/references/diagnose.md` describes. This folder is the ready-made runner for when you have Node.

## Setup

```bash
npm install --prefix engine
npx --prefix engine playwright install chromium
```

## CLI

```bash
node engine/cli.mjs https://example.com --out out    # report.json, annotated-1440.png, annotated-390.png
node engine/cli.mjs ./page.html --json --widths 1440 # one width, JSON to stdout
node engine/cli.mjs https://example.com --widths responsive  # 360 to 1440 in nine steps, for the RSP rules
node engine/cli.mjs https://example.com --extract    # content JSON for a rebuild (content.json with --out)
node engine/cli.mjs --rules                          # every rule, how it is checked, severity
node engine/cli.mjs --explain KO-01                  # what, why, how it is found, fix
```

Exit code is 0 with no findings, 1 with findings, 2 on error. The report groups findings by rule, most severe first, with exact counts per width, the selector, page rect and evidence for each spot, the fix and the fix patterns. It also lists the manual rules, which the detector does not measure and you judge from the captures.

## MCP server

Prompt: `start` (the opening question: does the site already exist, or are we building a new one?).

Tools: `diagnose` (report plus one capture per width), `extract_content` (the page's content in reading order, for a rebuild), `list_rules`, `explain_rule`, and the swap tools `suggest_swaps`, `list_patterns`, `get_pattern`, `get_component`, `taxonomy`.

Claude Code:

```bash
claude mcp add taster -- node /path/to/taster/engine/mcp.mjs
```

Codex, in `~/.codex/config.toml`:

```toml
[mcp_servers.taster]
command = "node"
args = ["/path/to/taster/engine/mcp.mjs"]
```

## Checks

```bash
node rules/test-detect.mjs           # fixtures: exact rule sets on slop pages, zero on the clean page at both widths
node engine/scripts/check-rules.mjs  # rules.json schema, and detect.js checks exactly the measured rules
npm --prefix engine test             # CLI, MCP and extract
node engine/scripts/check-rebuild-example.mjs  # examples/rebuild: original is slop, rebuild is clean and keeps the content
```

To add a measured rule: write the check in `rules/detect.js` (`flag('XX-00', el, evidence)`), set its `detect.level` to `deterministic` in `rules/rules.json`, make a fixture in `rules/fixtures/` hit it and add the id to `rules/fixtures/expected.json`. The clean fixture must stay at zero.
