// After `next build`: the routes that import engine files at run time must have those files in their trace, or
// they work locally (the whole disk is there) and fail on Vercel with ENOENT. Run after the build.
import { readFileSync } from 'node:fs';

const NEED = {
  'app/r/[...slug]/route.js': ['packages/engine/add.mjs', 'packages/registry/registry.json', 'packages/registry/src/blocks/badge.tsx', 'packages/registry/THIRD_PARTY_NOTICES.md'],
  'app/api/mcp/route.js': ['packages/engine/http.mjs', 'packages/engine/server.mjs', 'packages/engine/catalog.mjs', 'packages/engine/system.mjs', 'packages/engine/measure.js', 'packages/engine/consistency.mjs', 'packages/engine/plan.mjs', 'packages/engine/tone.mjs', 'packages/engine/tone-capture.mjs', 'data/taxonomy/axes.mjs', 'packages/registry/previews/blocks-button.dark.jpg', 'data/rules/rules.json', 'data/patterns/INDEX.json', 'data/taxonomy/taxonomy.json', 'data/taxonomy/tone-refs.json', 'packages/registry/registry.json', 'skills/taster/references/start.md'],
  'app/api/tone-shot/route.js': ['node_modules/playwright-core/package.json', 'node_modules/@sparticuz/chromium/package.json'],
  'app/api/brand/route.js': ['packages/engine/brand.mjs', 'packages/engine/diagnose.mjs', 'packages/engine/extract.js', 'data/rules/detect.js'],
  'app/api/diagnose/route.js': ['packages/engine/diagnose.mjs', 'data/rules/detect.js', 'data/rules/rules.json'],
};
let bad = 0;
for (const [route, files] of Object.entries(NEED)) {
  const traced = JSON.parse(readFileSync(new URL(`../.next/server/${route}.nft.json`, import.meta.url), 'utf8')).files;
  for (const f of files) {
    if (!traced.some((t) => t.endsWith(`/${f}`))) {
      console.log(`${route} does not trace ${f}`);
      bad++;
    }
  }
}
if (bad) process.exit(1);
console.log('TRACES OK');
