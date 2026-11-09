// The site's head tags and headers, read from the code that makes them: the security headers in next.config.mjs, the
// crawler rules in app/robots.ts and the numbers on the link preview picture. scripts/check-metadata.mjs checks the
// same things on a running server (real responses, the 404 screen, the sitemap, no policy violation in a browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// @ts-expect-error next.config.mjs is plain JavaScript with no declaration file; the blocks are typed below.
import config from '../next.config.mjs';
import robots from '../app/robots.ts';

type Header = { key: string; value: string };
type Block = { source: string; headers: Header[] };

const blocks: Block[] = await config.headers();
const block = (source: string) => {
  const found = blocks.find((b) => b.source === source);
  assert.ok(found, `next.config.mjs has a headers block for ${source}`);
  return found;
};
const value = (b: Block, key: string) => b.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;
// The header a path finally gets: Next applies every matching block in order and a later key replaces an earlier one.
const last = (sources: string[], key: string) => sources.map(block).reduce<string | undefined>((v, b) => value(b, key) ?? v, undefined);
const directives = (csp: string) => new Map(csp.split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([name, ...rest]) => [name, rest]));

test('every page gets a content security policy and a permissions policy', () => {
  const all = block('/(.*)');
  const csp = directives(value(all, 'Content-Security-Policy') || '');
  assert.deepEqual(csp.get('default-src'), ["'self'"]);
  assert.deepEqual(csp.get('object-src'), ["'none'"]);
  assert.deepEqual(csp.get('base-uri'), ["'self'"]);
  assert.deepEqual(csp.get('form-action'), ["'self'"]);
  assert.deepEqual(csp.get('frame-ancestors'), ["'none'"]);
  assert.deepEqual(csp.get('connect-src'), ["'self'"]);
  assert.deepEqual(csp.get('font-src'), ["'self'"]);
  // The diagnosis and the tone page show their screens as data: pictures.
  assert.ok(csp.get('img-src')?.includes('data:'), 'img-src allows data: pictures');
  assert.ok(!csp.get('script-src')?.includes("'unsafe-eval'"), 'no eval outside next dev');
  const permissions = value(all, 'Permissions-Policy') || '';
  for (const feature of ['camera=()', 'microphone=()', 'geolocation=()', 'browsing-topics=()']) assert.ok(permissions.includes(feature), `Permissions-Policy turns off ${feature}`);
  assert.equal(value(all, 'X-Frame-Options'), 'DENY');
});

test('the stage can be framed by this site only, and nothing else can', () => {
  const stage = ['/(.*)', '/stage/:file*'];
  assert.equal(last(stage, 'X-Frame-Options'), 'SAMEORIGIN');
  const csp = directives(last(stage, 'Content-Security-Policy') || '');
  assert.deepEqual(csp.get('frame-ancestors'), ["'self'"]);
  assert.deepEqual(csp.get('default-src'), ["'self'"], 'the stage keeps the rest of the policy');
  assert.ok(blocks.indexOf(block('/stage/:file*')) > blocks.indexOf(block('/(.*)')), 'the stage block comes after the one for every page');
});

test('a versioned overlay folder is cached for good, the old address only briefly', () => {
  const legacy = ['/taster/:file*'];
  const versioned = ['/taster/:file*', '/taster/:folder/:file+'];
  for (const sources of [legacy, versioned]) {
    // The bookmarklet loads these into other sites' pages with an integrity hash, which needs CORS.
    assert.equal(last(sources, 'Access-Control-Allow-Origin'), '*');
    assert.equal(last(sources, 'Cross-Origin-Resource-Policy'), 'cross-origin');
  }
  assert.match(last(legacy, 'Cache-Control') || '', /max-age=300\b/);
  assert.doesNotMatch(last(legacy, 'Cache-Control') || '', /immutable/);
  assert.match(last(versioned, 'Cache-Control') || '', /max-age=31536000, immutable/);
  assert.ok(blocks.indexOf(block('/taster/:folder/:file+')) > blocks.indexOf(block('/taster/:file*')), 'the versioned block wins over the general one');
});

test('the link preview picture names the rule counts the rules have now', () => {
  const rules = JSON.parse(readFileSync(new URL('../../../rules/rules.json', import.meta.url), 'utf8')).rules as { detect: { level: string } }[];
  const meta = JSON.parse(readFileSync(new URL('../scripts/og/meta.json', import.meta.url), 'utf8'));
  const now = { rules: rules.length, measured: rules.filter((r) => r.detect.level !== 'manual').length };
  assert.deepEqual(meta, now, 'public/og.png is out of date: run node apps/web/scripts/og/render.mjs');
});

test('robots keeps crawlers off the API routes and the board, and points at the sitemap', () => {
  const r = robots();
  const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
  assert.equal(rules.length, 1);
  assert.equal(rules[0].userAgent, '*');
  assert.equal(rules[0].allow, '/');
  assert.deepEqual(rules[0].disallow, ['/api/', '/board']);
  assert.match(String(r.sitemap), /^https?:\/\/[^/]+\/sitemap\.xml$/);
});
