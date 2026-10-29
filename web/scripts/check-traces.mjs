// After `next build`: the routes that import engine files at run time must have those files in their trace, or
// they work locally (the whole disk is there) and fail on Vercel with ENOENT. Run after the build.
import { readFileSync } from 'node:fs';

const NEED = {
  'app/r/[...slug]/route.js': ['engine/add.mjs', 'registry/registry.json', 'registry/src/blocks/badge.tsx', 'registry/THIRD_PARTY_NOTICES.md'],
  'app/api/mcp/route.js': ['engine/http.mjs', 'engine/server.mjs', 'engine/catalog.mjs', 'rules/rules.json', 'patterns/INDEX.json', 'taxonomy/taxonomy.json', 'registry/registry.json', 'skills/taster/references/start.md'],
  'app/api/diagnose/route.js': ['engine/diagnose.mjs', 'rules/detect.js', 'rules/rules.json'],
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
