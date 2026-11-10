// A fingerprint of everything the stage page and the preview pictures are built from. scripts/validate.mjs compares it
// with stage/meta.json, so a component change without `npm --prefix packages/registry run build-stage` fails the check.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

function files(rel) {
  const full = path.join(root, rel)
  if (fs.statSync(full).isFile()) return [rel]
  return fs.readdirSync(full).sort().flatMap((name) => files(path.join(rel, name)))
}

export function stageHash() {
  const hash = createHash('sha256')
  for (const rel of ['src', 'demo/src', 'demo/build.mjs', 'tailwind.config.cjs', 'build-stage.mjs'].flatMap(files)) {
    hash.update(rel.split(path.sep).join('/'))
    hash.update(fs.readFileSync(path.join(root, rel)))
  }
  return hash.digest('hex')
}

/** The file name of a component's preview picture: blocks/button and dark give blocks-button.dark.jpg. */
export const previewFile = (id, theme) => `${id.replace(/\//g, '-')}.${theme}.jpg`
