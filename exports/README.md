# Exports

Taster's rules as instruction files for coding agents that do not use the MCP server. Generated from
`rules/rules.json` by `node scripts/build-docs.mjs`; `scripts/validate.mjs` fails when one is stale. Do not edit by hand.

| Tool | File in this folder | Put it at |
|---|---|---|
| AGENTS.md readers (Codex, Jules, Amp, Zed and others) | `agents/AGENTS.md` | `AGENTS.md` |
| Claude Code | `claude/CLAUDE.md` | `CLAUDE.md` |
| Cursor | `cursor/taster.mdc` | `.cursor/rules/taster.mdc` |
| Windsurf | `windsurf/taster.md` | `.windsurf/rules/taster.md` |
| Cline | `cline/taster.md` | `.clinerules/taster.md` |
| GitHub Copilot | `copilot/copilot-instructions.md` | `.github/copilot-instructions.md` |
| Gemini CLI | `gemini/GEMINI.md` | `GEMINI.md` |

Or let the CLI put them there. In files you share with your own instructions (AGENTS.md, CLAUDE.md, GEMINI.md,
copilot-instructions.md) it writes only between `<!-- taster:start -->` and `<!-- taster:end -->`, so running it
again updates the rules and keeps your text:

```bash
node engine/cli.mjs export cursor --dir /path/to/your/app
node engine/cli.mjs export all --dir /path/to/your/app
```
