// Registry files for `taster add --from https://taster-six.vercel.app`: /r/<id>.json returns one component with
// every file it imports and the token files, /r/index.json lists the ids. Built by engine/add.mjs, which is
// loaded at run time so it reads registry/ next to itself, the same way the CLI does.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const runtime = 'nodejs';

type Bundle = { ids: string[]; files: { path: string; content: string }[]; npm: string[]; credits: unknown[] };
type Add = { resolveComponents: (ids: string[]) => Bundle; loadRegistry: () => { components: { id: string; category: string }[] } };

let addPromise: Promise<Add> | null = null;
function loadAdd(): Promise<Add> {
  const candidates = [path.resolve(process.cwd(), '../engine/add.mjs'), path.resolve(process.cwd(), 'engine/add.mjs'), '/var/task/engine/add.mjs'];
  const found = candidates.find((c) => existsSync(c));
  if (!found) return Promise.reject(new Error('engine/add.mjs not found'));
  addPromise ||= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ pathToFileURL(found).href) as Promise<Add>;
  return addPromise;
}

const headers = { 'cache-control': 'public, max-age=300, s-maxage=3600', 'access-control-allow-origin': '*' };

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const joined = slug.join('/');
  if (!joined.endsWith('.json')) return Response.json({ error: 'Use /r/<id>.json' }, { status: 404, headers });
  const id = joined.slice(0, -'.json'.length);
  const add = await loadAdd();
  if (id === 'index') {
    return Response.json({ components: add.loadRegistry().components.map((c) => ({ id: c.id, category: c.category })) }, { headers });
  }
  if (!/^[a-z]+\/[a-z0-9-]+$/.test(id)) return Response.json({ error: `Bad id ${id}` }, { status: 400, headers });
  try {
    return Response.json(add.resolveComponents([id]), { headers });
  } catch (err) {
    return Response.json({ error: (err as Error).message.split('. Run')[0] }, { status: 404, headers });
  }
}
