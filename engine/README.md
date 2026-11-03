# engine

Runs the slop detector (`rules/detect.js`) in a real Chromium at 1440 and 390 wide, writes an annotated capture per width, and serves the same thing to agents over MCP and to editors over ACP.

`rules/detect.js` has no dependencies. Any browser tool can load it into a page and call `window.tasterDetect({ highlight: true })`, as `skills/taster/references/diagnose.md` describes. This folder is the ready-made runner for when you have Node.

## Setup

Node.js 22 or later. From the repository root:

```bash
npm ci --prefix engine
node engine/setup.mjs    # finds a browser (Playwright's Chromium, then Google Chrome), downloads Chromium only if neither starts
```

`npx --prefix engine playwright install chromium` installs Chromium directly.

## CLI

```bash
node engine/cli.mjs https://example.com --out out    # report.json, annotated-1440.jpg, annotated-390.jpg
node engine/cli.mjs ./page.html --json --widths 1440 # one width, JSON to stdout
node engine/cli.mjs https://example.com --widths responsive  # 360 to 1440 in nine steps, for the RSP rules
node engine/cli.mjs https://example.com --extract    # content JSON for a rebuild (content.json with --out)
node engine/cli.mjs https://example.com --brand      # brand theme CSS and notes (theme.css with --out, JSON with --json)
node engine/cli.mjs --system https://example.com --ref ./liked.html --out sys  # design system: taster.system.json, theme.css
node engine/cli.mjs --tune sys/taster.system.json density=0.75  # move a weight, rebalance, say what moved
node engine/cli.mjs --consistency a.html b.html --system tokens.css --system theme.css  # drift between screens, values off the system
node engine/cli.mjs --plan https://example.com --out work --system theme.css  # taster.plan.json: the screens, one at a time
node engine/cli.mjs --rules                          # every rule, how it is checked, severity
node engine/cli.mjs --explain KO-01                  # what, why, how it is found, fix
node engine/cli.mjs lint src                         # the rules' source form, no browser (also: node engine/lint.mjs)
node engine/cli.mjs --help                           # every option, and the exit codes
```

`add` copies components into an app, relative to the folder it runs in, so run it from the app folder by the clone's
path: `node /path/to/taster/engine/cli.mjs add blocks/button --dir src/components/taster` (see
`registry/README.md`).

A page that answers with a bot check, a block or error page (HTTP 4xx or 5xx), or a sign-in page on another host is not
diagnosed: nothing is measured, the report says why, and the exit code is 2. Nothing here gets past a check or a
sign-in.

### Environment

- `TASTER_ROOT=<dir>`: open local files only inside `<dir>` (the CLI, the MCP server and the ACP agent). Without it,
  any local `.html`, `.htm`, `.xhtml` or `.svg` file the user's account can read is opened; other local files are
  refused.
- `TASTER_WEB_URL=<url>`: where the component, board and tone map links that the MCP tools give point, default
  `https://taster-six.vercel.app`, for a self-hosted copy of the site.

What the local tools can reach (addresses, files, what they write) is in
[SECURITY.md](../SECURITY.md#what-the-local-tools-can-reach).

### Source lint

`lint` reads tsx, jsx, vue, svelte, html, css and md files for the code form of the rules, so slop is caught in
review before anything renders. Checks that mirror a measured rule carry its id and its fix (AC-01 caps with wide
tracking, AC-02 long dashes, AC-03 emoji, AC-04 tinted pill, AC-05 outlined pill, AC-10 thick left bar, AC-08 colored
dot, AC-09 mono labels, MOT-02 transition-all, MOT-04 ease-in). Checks that only make sense in source use SRC ids:
SRC-01 hard-coded color in a component (custom property definitions and var() fallbacks pass), SRC-02 pixel one-off
outside the scale, SRC-03 stock palette class instead of a token, SRC-04 Tailwind screens replaced instead of
extended (the defaults vanish and every sm: and lg: class stops generating CSS).

- `--baseline <file>` turns it into a ratchet: counts per file and check may only go down. Write the first one with
  `--write-baseline`. This repository's registry runs that way in CI (`registry/lint-baseline.json`).
- `taster-allow <reason>` on the line or the line above lets one line through; without a reason it is reported (SRC-00).
- `--selftest` runs every check on lines it must catch and lines it must pass, so a check that stops matching fails CI.
- Comments, Markdown code fences, `node_modules`, build output and minified files are skipped.

Exit code is 0 with no findings, 1 with findings, 2 on an error or a target that was not diagnosed. The report groups findings by rule, most severe first, with exact counts per width, the selector, page rect and evidence for each spot, the fix and the fix patterns. It also lists the manual rules, which the detector does not measure and you judge from the captures.

## MCP server

Prompt: `start` (the opening question: does the site already exist, or are we building a new one?).

Tools: `pick_tone` (a spot on the tone map: the nearest real sites with their first screens, opened on request, never written to disk and kept in server memory up to 30 minutes, the eight axes of the spot passed through the design system's balance, its tokens, and a Taster part rendered in them), `browse_components` (numbered candidates as pictures, a live link each and one board link), `preview_component` (one component rendered in a brand, as a picture), `diagnose` (report plus one capture per width), `brand_theme` (the site's brand color, typeface and logo as token overrides, with success and failure colors fitted to them), `extract_content` (the page's content in reading order, for a rebuild), `design_system`, `tune_system` and `system_for_category` (the design system, see `skills/taster/references/system.md`), `list_rules`, `explain_rule`, and the swap tools `suggest_swaps`, `list_patterns`, `get_pattern`, `get_component`, `taxonomy`.

Screen by screen (`skills/taster/references/screens.md`): `check_consistency` (render every screen at 1440 and 390 and report the same component drawn differently on two screens, and every radius, spacing step, typeface, color, shadow or duration that is not one of the system's tokens; the logo face a system declares as `identity.logoFont` is listed apart as exempt, inside the logo only), `plan_screens` (the start page and its same-site nav pages as `taster.plan.json`), `plan_next` (exactly one next step) and `plan_update` (records propose, revise, approve, build, check and accept; refuses a build before the builder's approval and a new screen before the last one is checked, runs the check itself, and passes it only when every finding left is an exception the builder accepted, with the reason and their words on record).

What a page says (the report of `diagnose`, the content of `extract_content`, the page values in `brand_theme`)
comes back inside an `<untrusted_page_content>` block after a sentence from Taster, so the agent reads it as data and
never as instructions. A page that is not the site (a bot check, a block, error or sign-in page) is an error that
starts with `not diagnosed`, with no findings. Captures come back as JPEG images of at most 4 MB each and their
temporary folder is deleted with the answer; a capture that would not fit is left in the system temporary folder and
named by its path.

`start.mjs` installs the engine's dependencies on its first start, then serves `mcp.mjs` on stdio. That first install
can take longer than a client waits for a server: run `npm ci --prefix /path/to/taster/engine` once beforehand, or
reconnect the server after it finishes.

Claude Code:

```bash
claude mcp add taster -- node /path/to/taster/engine/start.mjs
```

Codex, in `~/.codex/config.toml`:

```toml
[mcp_servers.taster]
command = "node"
args = ["/path/to/taster/engine/start.mjs"]
```

Cursor, in `.cursor/mcp.json` (or `~/.cursor/mcp.json`):

```json
{ "mcpServers": { "taster": { "command": "node", "args": ["/path/to/taster/engine/start.mjs"] } } }
```

## Hosted MCP (HTTP)

`server.mjs` builds the MCP server; `mcp.mjs` serves it on stdio and `http.mjs` answers one Streamable HTTP request
statelessly (`handleMcpRequest(request, { remote })`), so it runs on serverless functions. Hosted mode takes
`remote.diagnose(url)` from the host instead of opening a local browser, and `brand_theme` and the reference screens of
`pick_tone` only when the host gives `remote.brand` and `remote.tone`. It leaves out `extract_content`, the design
system tools and the screen by screen tools, which open pages in a local browser and read or write files, and
`preview_component` answers with the still and a live link instead of a render.

`web/app/api/mcp/route.ts` mounts it at `/api/mcp` and gives all three, so the hosted server lacks only
`extract_content`, the design system tools and the screen by screen tools. `diagnose`, `brand_theme` and the reference
screens go through the same fence as `/api/diagnose` and `/api/brand`: public http(s) only, a request budget, per
client limits that each instance keeps on its own, and one browser at a time. The route takes one JSON-RPC message
per POST (a batch gets 400), counts every tool call against a per client minute, and answers with an error instead of
anything over 4 MB (`web/README.md`).

## ACP agent

`acp.mjs` serves the same engine to editors over the [Agent Client Protocol](https://agentclientprotocol.com)
(JSON-RPC on stdio, protocol version 1, `@agentclientprotocol/sdk`). There is no model inside, so it answers slash
commands, which it advertises with `available_commands_update` after `session/new`:

- `/start`: the opening question, read from `skills/taster/references/start.md`.
- `/diagnose <url or file>`: one `tool_call` for the browser run (the annotated captures as its locations), then the
  findings as text. A relative path is read from the session's `cwd`. The captures go to a `taster-acp-` folder in the
  system temporary folder, so the editor can open them, and are deleted at the next `/diagnose` in the same session or
  when the agent exits.
- `/extract <url>`, `/brand <url>`: content JSON, or the theme CSS and notes.
- `/explain <rule id>`, `/rules`, `/help`.

Plain text gets a short help reply. `session/cancel` ends the turn with `stopReason: "cancelled"`; a browser run already
started finishes in the background and its result is dropped.

Zed, in `settings.json`:

```json
{
  "agent_servers": {
    "Taster": { "type": "custom", "command": "node", "args": ["/path/to/taster/engine/start.mjs", "acp"], "env": {} }
  }
}
```

`start.mjs acp` installs the dependencies on first start (the MCP launcher does the same with no argument), then
serves `acp.mjs`. JetBrains IDEs, in `~/.jetbrains/acp.json`: the same `agent_servers` entry without `type`, with the
full path of `node` in `command`. With the engine linked or installed globally, `taster-acp` is the same agent.

Try it by hand:

```bash
printf '%s\n' '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":1}}' | node engine/acp.mjs
```

## Checks

`node scripts/gates.mjs` runs these with every other gate, in CI's order (see `CONTRIBUTING.md`). One by one:

```bash
node rules/test-detect.mjs           # fixtures: exact rule sets on slop pages, zero on the clean page at both widths
node engine/scripts/check-rules.mjs  # rules.json schema, and detect.js checks exactly the measured rules
npm --prefix engine test             # CLI, MCP, ACP, extract, consistency and the plan steps
node engine/scripts/check-rebuild-example.mjs  # examples/rebuild: original is slop (the count the READMEs give), both rebuilt screens are clean, consistent and on the system
```

To add a measured rule: write the check in `rules/detect.js` (`flag('XX-00', el, evidence)`), set its `detect.level` to `deterministic` in `rules/rules.json`, make a fixture in `rules/fixtures/` hit it and add the id to `rules/fixtures/expected-engine.json`. The clean fixture must stay at zero.

Before trusting a new check, run it on the code from before your fix and watch it fail (a negative control): a check that passes on both versions measures nothing. Known findings you decide to keep go in a baseline with a reason (`taster lint --baseline`), and the count may only go down.

### Headless Chrome traps

- A real browser window will not shrink below about 500px. Set the viewport (`newPage({ viewport })`) instead of resizing a window, or narrow layouts are never measured.
- CSS transitions and animations may still be running when you measure. Wait for them, or measure after `document.getAnimations()` has settled; the detector already skips text that is still fading in.
- A light page can be turned dark by the browser's automatic dark mode. Pin `color-scheme` on the page (or in the launch flags) before judging colors.
- A local server that checks the Host header can refuse the headless request; send the host it expects or serve on localhost.
