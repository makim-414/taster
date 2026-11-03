// Copies the detector fixtures into public/fixtures so the deployed site can diagnose a known
// slop page and a known clean page at a public address. The files stay generated, not committed.
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const from = new URL('../../rules/fixtures/', import.meta.url);
const to = new URL('../public/fixtures/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const name of ['slop.html', 'slop-ko.html', 'clean.html']) copyFileSync(new URL(name, from), new URL(name, to));
console.log('fixtures copied to public/fixtures');

// The browser overlay (extension/) as static files, for the bookmarklet on /bookmarklet. Each release gets its own
// folder, public/taster/<version>/ (extension/manifest.json's version): the bookmarklet loads overlay.js from it with
// the overlay's sha384, and the overlay copy carries the sha384 of detect.js and rules.js, so a bookmark only ever runs
// the files it was made with. bookmarklet.json tells app/bookmarklet/page.tsx the version and the overlay's hash.
// public/taster/ itself keeps a copy for bookmarks made before the versioned folders. Generated, not committed.
const ext = new URL('../../extension/', import.meta.url);
const pub = new URL('../public/taster/', import.meta.url);
const sri = (bytes) => `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
const { version } = JSON.parse(readFileSync(new URL('manifest.json', ext), 'utf8'));
const files = { 'detect.js': readFileSync(new URL('detect.js', ext)), 'rules.js': readFileSync(new URL('rules.js', ext)) };
const SLOT = 'var INTEGRITY = {};';
const source = readFileSync(new URL('overlay.js', ext), 'utf8');
if (!source.includes(SLOT)) throw new Error(`extension/overlay.js lost the line ${SLOT}`);
const overlay = source.replace(SLOT, `var INTEGRITY = ${JSON.stringify(Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, sri(bytes)])))};`);
for (const dir of [new URL(`${version}/`, pub), pub]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('overlay.js', dir), overlay);
  for (const [name, bytes] of Object.entries(files)) writeFileSync(new URL(name, dir), bytes);
}
writeFileSync(new URL('bookmarklet.json', pub), `${JSON.stringify({ version, overlay: sri(overlay) }, null, 2)}\n`);
console.log(`overlay copied to public/taster/${version}`);

// The gallery's live stage and preview pictures. registry/ holds them for the MCP tools too. Generated, not committed.
const reg = new URL('../../registry/', import.meta.url);
cpSync(new URL('stage/index.html', reg), new URL('../public/stage/index.html', import.meta.url));
cpSync(new URL('previews/', reg), new URL('../public/previews/', import.meta.url), { recursive: true });
console.log('stage and previews copied to public');
