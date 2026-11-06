# Releasing

Everything below is prepared in the repository and checked; the steps that publish happen on release day, in this
order, by the owner. Version 0.1.0.

## Before

- `node scripts/gates.mjs` passes on `main` (every gate CI runs, in the same order; see `CONTRIBUTING.md`) and CI is
  green there.
- `npm pack --dry-run` lists `bin/`, `engine/`, `rules/`, `patterns/`, `taxonomy/`, `registry/`, `skills/`, `exports/`,
  `extension/` and no `node_modules`, `web/` or `.github/`.
- Run the private name check over the repository and fix every hit.

## Release day

1. Make `makim-414/taster` public on GitHub. Done on 2026-11-02.
2. npm: in `package.json` remove `"private": true`, then `npm publish --access public` (package `@makim-414/taster`,
   command `taster`). Check `npx @makim-414/taster --rules` from an empty folder. The unscoped name `taster` is taken;
   `taster-cli` and `taster-ui` were free on 2026-10-29 if a short name is wanted later.
3. ACP registry: fork https://github.com/agentclientprotocol/registry, copy `.github/acp-registry/taster/` to the
   fork's root, open a pull request. Its CI launches `npx @makim-414/taster@0.1.0 acp` and checks the handshake, so this
   step comes after step 2.
   - The folder holds an `agent.json`, checked against that repository's `agent.schema.json`, and a 16 px
     `currentColor` icon. Nothing in it is published by this repository itself. `node scripts/build-docs.mjs` writes
     its description and `node scripts/validate.mjs` checks its version and npx package against `package.json`.
   - The registry lists agents with Agent or Terminal auth. Taster has no account, so its terminal method is the
     one-time browser setup (`taster acp --setup`), which nothing requires before use.
4. Chrome Web Store: zip `extension/` (manifest, background, overlay, generated detector and rule names, icons) and
   submit. Permissions to explain: `activeTab` and `scripting`, used only when the button is clicked. No data leaves
   the tab. Edge Add-ons takes the same zip.
5. Agent skill directories: the skill is `skills/taster/SKILL.md` (name and description frontmatter). The Claude Code
   marketplace entry is `.claude-plugin/marketplace.json` (`/plugin marketplace add makim-414/taster`); the Codex entry
   is `.codex-plugin/plugin.json`.
6. GitHub Action: tag `v0.1.0` and `v0` so users can pin `makim-414/taster@v0`, and list it on the Marketplace from the
   release page (action.yml has name, description and branding).

## After

- Once step 2 is live, turn the install lines that run the clone's CLI back into npx lines: in `README.md`,
  `README.ko.md` and `registry/README.md`, `node /path/to/taster/engine/cli.mjs lint ...` and `... add ...` become
  `npx @makim-414/taster lint ...` and `npx @makim-414/taster add ...`, and the clone and `npm ci` lines that only
  served them go. Do the same for the install lines on the web (the component pages and the board), and say in the
  READMEs that the package is published.
- Once step 6 is live, change the Action example in `README.md` and `README.ko.md` from `makim-414/taster@main` to
  `makim-414/taster@v0`, and drop the sentence that says there is no release tag yet.
- The hosted MCP (`https://taster-six.vercel.app/api/mcp`) and `/bookmarklet` are already live from `main`.
