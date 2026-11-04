import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..');
// The gallery asks for /stage/index.html?v=<this>, so each stage build has its own address the browser can keep for good.
const stageVersion = createHash('sha256').update(readFileSync(path.join(repo, 'registry/stage/index.html'))).digest('hex').slice(0, 12);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: { STAGE_VERSION: stageVersion },
  // The app reads ../engine, ../rules and ../registry, so tracing and Turbopack start at the repo root.
  outputFileTracingRoot: repo,
  turbopack: { root: repo },
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  // engine/diagnose.mjs is imported at run time (not bundled), so the engine files it reads are listed by hand.
  outputFileTracingIncludes: {
    // engine/http.mjs and engine/server.mjs are also imported at run time; they read the catalog files below.
    '/api/mcp': [
      '../engine/*.mjs',
      '../engine/*.js',
      '../engine/package.json',
      '../engine/node_modules/**',
      '../rules/detect.js',
      '../rules/rules.json',
      '../patterns/**',
      '../taxonomy/**',
      '../registry/registry.json',
      '../registry/src/**',
      '../registry/previews/**',
      '../skills/taster/references/start.md',
      './node_modules/playwright-core/**',
      './node_modules/@sparticuz/chromium/**',
    ],
    // Keys are globs over route paths, so the brackets of [...slug] would read as a character class.
    '/r/**': ['../engine/add.mjs', '../registry/registry.json', '../registry/src/**', '../registry/THIRD_PARTY_NOTICES.md'],
    '/api/brand': [
      '../engine/*.mjs',
      '../engine/*.js',
      '../engine/package.json',
      '../rules/detect.js',
      '../rules/rules.json',
      './node_modules/playwright-core/**',
      './node_modules/@sparticuz/chromium/**',
    ],
    // The capture code (engine/tone-capture.mjs) and the catalog are bundled into the route; only the browser is traced.
    '/api/tone-shot': ['./node_modules/playwright-core/**', './node_modules/@sparticuz/chromium/**'],
    '/api/diagnose': [
      '../engine/*.mjs',
      '../engine/*.js',
      '../engine/package.json',
      '../rules/detect.js',
      '../rules/rules.json',
      '../engine/node_modules/playwright/**',
      '../engine/node_modules/playwright-core/**',
      './node_modules/playwright-core/**',
      './node_modules/@sparticuz/chromium/**',
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        // The bookmarklet loads these into other sites' pages with an integrity hash, which needs CORS. Bookmarks
        // made before the pinned folders load /taster/overlay.js itself, so that address keeps a short cache.
        source: '/taster/:file*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
      {
        // A pinned folder (scripts/copy-fixtures.mjs) is named after its files' hash, so what it holds never changes.
        source: '/taster/:folder/:file+',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: csp("'none'") },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
        ],
      },
      {
        // The gallery's stage address carries its build's hash, so a frame made again after a scroll reads the cached
        // copy instead of asking again. A request cut off mid-way while frames come and go no longer throws it away.
        source: '/stage/index.html',
        has: [{ type: 'query', key: 'v' }],
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // The gallery runs each component in a frame on this same site. Later rules win, so this one must stay last.
        source: '/stage/:file*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: csp("'self'") },
        ],
      },
    ];
  },
};

// Everything comes from this site. Next inlines its boot scripts and the pages carry style attributes, hence
// unsafe-inline; the diagnosis and the tone page show screens as data: pictures. Only next dev needs eval (React's
// development build rebuilds server error stacks with it).
function csp(frameAncestors) {
  const dev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export default nextConfig;
