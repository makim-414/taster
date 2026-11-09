## What and why

<!-- What changes for someone using Taster, and why. Link the issue if there is one. -->

## Checks

<!-- Tick what you ran. CONTRIBUTING.md lists every command in CI order. -->

- [ ] `node scripts/gates.mjs` (all four jobs below), or the jobs this change touches
- [ ] `node scripts/build-docs.mjs`, and the generated files it changed are in this pull request
- [ ] validate: `node scripts/validate.mjs`, `node scripts/check-taxonomy.mjs`, `node --test data/taxonomy/axes.test.mjs`,
  `node packages/engine/scripts/check-rules.mjs`, registry typecheck, lint selftest and baseline, the gate script tests, commit emails
- [ ] browser: `node data/rules/test-detect.mjs`, `npm --prefix packages/engine test`, the rebuild and icon slot examples, the registry
  render, accessibility and injection tests
- [ ] web: build, `check-traces`, `npm --prefix apps/web test`, `self-check`, `check-gallery`, `check-tone`, `check-metadata`,
  `check-a11y`
- [ ] A line under `Unreleased` in `CHANGELOG.md`, if a user would notice the change

## Screens

<!-- For a change to anything that renders: captures at 390 and 1280 wide, of Taster's own pages and parts only. -->

## Sources and names

- [ ] Code, pictures and fonts from elsewhere have a confirmed license, a header line and an entry in
  `THIRD_PARTY_NOTICES.md`, or were written new with the link in the pattern's `inspiration`
- [ ] No screenshots of other people's sites or products, and no logos or wordmarks I do not own
- [ ] No local paths, personal email addresses, or names of private projects, clients or companies in the files, the
  commits or this text
