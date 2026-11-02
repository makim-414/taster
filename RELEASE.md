# Release

Everything below is prepared in the repository and checked; the steps that publish happen on release day, in this
order, by the owner. Version 0.1.0.

## Before

- `node scripts/validate.mjs`, `npm --prefix engine test`, `npm --prefix web test` and CI are green on `main`.
- `npm pack --dry-run` lists `bin/`, `engine/`, `rules/`, `patterns/`, `taxonomy/`, `registry/`, `skills/`, `exports/`,
  `extension/` and no `node_modules`, `web/` or `.github/`.
- Run the private name check over the repository and fix every hit before it goes public.

## Release day

1. Make `makim-414/taster` public on GitHub.
2. npm: in `package.json` remove `"private": true`, then `npm publish --access public` (package `@makim-414/taster`,
   command `taster`). Check `npx @makim-414/taster --rules` from an empty folder. The unscoped name `taster` is taken;
   `taster-cli` and `taster-ui` were free on 2026-10-29 if a short name is wanted later.
3. ACP registry: fork https://github.com/agentclientprotocol/registry, copy `distribution/acp-registry/taster/` to the
   fork's root, open a pull request. Its CI launches `npx @makim-414/taster@0.1.0 acp` and checks the handshake, so this
   step comes after step 2.
4. Chrome Web Store: zip `extension/` (manifest, background, overlay, generated detector and rule names, icons) and
   submit. Permissions to explain: `activeTab` and `scripting`, used only when the button is clicked. No data leaves
   the tab. Edge Add-ons takes the same zip.
5. Agent skill directories: the skill is `skills/taster/SKILL.md` (name and description frontmatter). The Claude Code
   marketplace entry is `.claude-plugin/marketplace.json` (`/plugin marketplace add makim-414/taster`); the Codex entry
   is `.codex-plugin/plugin.json`.
6. GitHub Action: tag `v0.1.0` and `v0` so users can pin `makim-414/taster@v0`, and list it on the Marketplace from the
   release page (action.yml has name, description and branding).

## After

- Update `README.md` install lines from `node engine/cli.mjs` to `npx @makim-414/taster` once step 2 is live.
- The hosted MCP (`https://taster-six.vercel.app/api/mcp`) and `/bookmarklet` are already live from `main`.
