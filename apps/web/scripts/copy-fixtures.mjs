// Copies the detector fixtures into public/fixtures so the deployed site can diagnose a known
// slop page and a known clean page at a public address. The files stay generated, not committed.
import { createHash } from 'node:crypto';
import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const from = new URL('../../../data/rules/fixtures/', import.meta.url);
const to = new URL('../public/fixtures/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const name of ['slop.html', 'slop-ko.html', 'clean.html']) copyFileSync(new URL(name, from), new URL(name, to));
console.log('fixtures copied to public/fixtures');

// The browser overlay (apps/extension/) as static files, for the bookmarklet on /bookmarklet. Each build of the three
// files gets its own folder, public/taster/<version>-<hash>/ (apps/extension/manifest.json's version and the start of the
// overlay's sha256, which covers detect.js and rules.js through their hashes inside it): the bookmarklet loads
// overlay.js from it with the overlay's sha384, and the overlay copy carries the sha384 of detect.js and rules.js, so a
// bookmark only ever runs the files it was made with. The rules change more often than the version does, so the hash
// in the name is what lets next.config.mjs cache a folder for good. bookmarklet.json tells app/bookmarklet/page.tsx the
// folder (as version) and the overlay's hash. public/taster/ itself keeps a copy for bookmarks made before the pinned
// folders. Generated, not committed.
const ext = new URL('../../extension/', import.meta.url);
const pub = new URL('../public/taster/', import.meta.url);
const sri = (bytes) => `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
const { version } = JSON.parse(readFileSync(new URL('manifest.json', ext), 'utf8'));
const files = { 'detect.js': readFileSync(new URL('detect.js', ext)), 'rules.js': readFileSync(new URL('rules.js', ext)) };
const SLOT = 'var INTEGRITY = {};';
const source = readFileSync(new URL('overlay.js', ext), 'utf8');
if (!source.includes(SLOT)) throw new Error(`apps/extension/overlay.js lost the line ${SLOT}`);
const overlay = source.replace(SLOT, `var INTEGRITY = ${JSON.stringify(Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, sri(bytes)])))};`);
const folder = `${version}-${createHash('sha256').update(overlay).digest('hex').slice(0, 12)}`;
for (const dir of [new URL(`${folder}/`, pub), pub]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('overlay.js', dir), overlay);
  for (const [name, bytes] of Object.entries(files)) writeFileSync(new URL(name, dir), bytes);
}
writeFileSync(new URL('bookmarklet.json', pub), `${JSON.stringify({ version: folder, overlay: sri(overlay) }, null, 2)}\n`);
console.log(`overlay copied to public/taster/${folder}`);

// The gallery's live stage and preview pictures. packages/registry/ holds them for the MCP tools too. Generated, not committed.
const reg = new URL('../../../packages/registry/', import.meta.url);
cpSync(new URL('stage/index.html', reg), new URL('../public/stage/index.html', import.meta.url));
// The license texts of the packages the stage bundles; the stage page points to this file next to it.
cpSync(new URL('stage/THIRD_PARTY_LICENSES.txt', reg), new URL('../public/stage/THIRD_PARTY_LICENSES.txt', import.meta.url));
cpSync(new URL('previews/', reg), new URL('../public/previews/', import.meta.url), { recursive: true });
console.log('stage, its license texts and previews copied to public');
