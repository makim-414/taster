# engine

Runs the slop detector (`rules/detect.js`) in a real Chromium at 1440 and 390 wide, writes an annotated capture per width, and serves the same thing to agents over MCP and to editors over ACP.

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
node engine/cli.mjs https://example.com --brand      # brand theme CSS and notes (theme.css with --out, JSON with --json)
node engine/cli.mjs --rules                          # every rule, how it is checked, severity
node engine/cli.mjs --explain KO-01                  # what, why, how it is found, fix
```

Exit code is 0 with no findings, 1 with findings, 2 on error. The report groups findings by rule, most severe first, with exact counts per width, the selector, page rect and evidence for each spot, the fix and the fix patterns. It also lists the manual rules, which the detector does not measure and you judge from the captures.

## MCP server

Prompt: `start` (the opening question: does the site already exist, or are we building a new one?).

Tools: `diagnose` (report plus one capture per width), `brand_theme` (the site's brand color, typeface and logo as token overrides, with success and failure colors fitted to them), `extract_content` (the page's content in reading order, for a rebuild), `list_rules`, `explain_rule`, and the swap tools `suggest_swaps`, `list_patterns`, `get_pattern`, `get_component`, `taxonomy`.

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

## ACP agent

`acp.mjs` serves the same engine to editors over the [Agent Client Protocol](https://agentclientprotocol.com)
(JSON-RPC on stdio, protocol version 1, `@agentclientprotocol/sdk`). There is no model inside, so it answers slash
commands, which it advertises with `available_commands_update` after `session/new`:

- `/start`: the opening question, read from `skills/taster/references/start.md`.
- `/diagnose <url or file>`: one `tool_call` for the browser run (the annotated captures as its locations), then the
  findings as text. A relative path is read from the session's `cwd`.
- `/extract <url>`, `/brand <url>`: content JSON, or the theme CSS and notes.
- `/explain <rule id>`, `/rules`, `/help`.

Plain text gets a short help reply. `session/cancel` ends the turn with `stopReason: "cancelled"`; a browser run already
started finishes in the background and its result is dropped.

Zed, in `settings.json`:

```json
{
  "agent_servers": {
    "Taster": { "type": "custom", "command": "node", "args": ["/path/to/taster/engine/acp.mjs"], "env": {} }
  }
}
```

JetBrains IDEs, in `~/.jetbrains/acp.json`: the same `agent_servers` entry without `type`. With the engine linked or
installed globally, `taster-acp` is the same command.

Try it by hand:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":1}}' | node engine/acp.mjs
```

## Checks

```bash
node rules/test-detect.mjs           # fixtures: exact rule sets on slop pages, zero on the clean page at both widths
node engine/scripts/check-rules.mjs  # rules.json schema, and detect.js checks exactly the measured rules
npm --prefix engine test             # CLI, MCP, ACP and extract
node engine/scripts/check-rebuild-example.mjs  # examples/rebuild: original is slop, rebuild is clean and keeps the content
```

To add a measured rule: write the check in `rules/detect.js` (`flag('XX-00', el, evidence)`), set its `detect.level` to `deterministic` in `rules/rules.json`, make a fixture in `rules/fixtures/` hit it and add the id to `rules/fixtures/expected.json`. The clean fixture must stay at zero.
