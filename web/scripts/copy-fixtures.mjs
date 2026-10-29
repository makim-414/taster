// Copies the detector fixtures into public/fixtures so the deployed site can diagnose a known
// slop page and a known clean page at a public address. The files stay generated, not committed.
import { copyFileSync, mkdirSync } from 'node:fs';

const from = new URL('../../rules/fixtures/', import.meta.url);
const to = new URL('../public/fixtures/', import.meta.url);
mkdirSync(to, { recursive: true });
for (const name of ['slop.html', 'slop-ko.html', 'clean.html']) copyFileSync(new URL(name, from), new URL(name, to));
console.log('fixtures copied to public/fixtures');

// The browser overlay (extension/) as static files, for the bookmarklet on /bookmarklet: it loads
// /taster/overlay.js, which fetches detect.js and rules.js next to it. Generated, not committed.
const ext = new URL('../../extension/', import.meta.url);
const pub = new URL('../public/taster/', import.meta.url);
mkdirSync(pub, { recursive: true });
for (const name of ['overlay.js', 'detect.js', 'rules.js']) copyFileSync(new URL(name, ext), new URL(name, pub));
console.log('overlay copied to public/taster');
