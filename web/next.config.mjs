import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
      '../skills/taster/references/start.md',
      './node_modules/playwright-core/**',
      './node_modules/@sparticuz/chromium/**',
    ],
    '/r/[...slug]': ['../engine/add.mjs', '../registry/registry.json', '../registry/src/**', '../registry/THIRD_PARTY_NOTICES.md'],
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
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
