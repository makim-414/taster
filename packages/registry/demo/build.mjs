// Builds demo/dist/index.html as one self-contained file: Tailwind CSS + esbuild bundle inlined. The page ships as
// stage/index.html (npm package, the web gallery), so the license texts of every npm package it bundles are written
// beside it to stage/THIRD_PARTY_LICENSES.txt, from the bundle's own input list.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Tailwind reads the content globs in tailwind.config.cjs from the working directory, so `node registry/build-stage.mjs`
// run from the repository root would otherwise find no classes and ship a page without its utility CSS.
process.chdir(root)
const postcss = require('postcss')
const tailwind = require('tailwindcss')
const autoprefixer = require('autoprefixer')

const dist = path.join(root, 'demo/dist')
fs.mkdirSync(dist, { recursive: true })

const twSrc = path.join(root, 'demo/src/tailwind.css')
const tw = await postcss([tailwind(path.join(root, 'tailwind.config.cjs')), autoprefixer]).process(
  fs.readFileSync(twSrc, 'utf8'),
  { from: twSrc },
)

const out = await build({
  entryPoints: [path.join(root, 'demo/src/main.tsx')],
  bundle: true,
  write: false,
  outdir: dist,
  format: 'iife',
  jsx: 'automatic',
  minify: true,
  target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.css': 'css' },
  absWorkingDir: root,
  // The license comments go to THIRD_PARTY_LICENSES.txt with the full license files, not into the page.
  legalComments: 'external',
  metafile: true,
})

let js = ''
let css = ''
const legal = []
for (const f of out.outputFiles) {
  if (f.path.endsWith('.LEGAL.txt')) legal.push(f.text.trim())
  else if (f.path.endsWith('.js')) js = f.text
  else if (f.path.endsWith('.css')) css = f.text
}

// node_modules/<pkg>/... (the innermost node_modules, for nested copies) for every file esbuild took code from, plus
// tailwindcss, whose generated CSS (preflight included) is inlined as well. A package without a license file stops the
// build unless NO_LICENSE_FILE says where its notice comes from: the page must not ship code whose notice it cannot carry.
const MIT_TERMS = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
const NO_LICENSE_FILE = {
  'react-remove-scroll-bar': [
    'The npm package ships no license file. Its package.json says MIT, author Anton Korzunov; the copyright line is',
    'the one in the repository LICENSE (https://github.com/theKashey/react-remove-scroll-bar/blob/master/LICENSE).',
    '',
    'MIT License',
    '',
    'Copyright (c) 2025 Anton Korzunov',
    '',
    MIT_TERMS,
  ].join('\n'),
  'victory-vendor': [
    'The npm package ships no top-level license file. Its package.json says "MIT AND ISC". The bundle takes only its',
    'ES entry points, which re-export the d3 packages listed in this file (each with its own ISC license above). The',
    'MIT part is the Victory project license (https://github.com/FormidableLabs/victory/blob/main/LICENSE.txt).',
  ].join('\n'),
}
const pkgDirs = new Set([path.dirname(require.resolve('tailwindcss/package.json'))])
for (const input of Object.keys(out.metafile.inputs)) {
  const at = input.lastIndexOf('node_modules/')
  if (at === -1) continue
  const rest = input.slice(at + 'node_modules/'.length).split('/')
  const name = rest[0].startsWith('@') ? rest.slice(0, 2).join('/') : rest[0]
  pkgDirs.add(path.join(root, input.slice(0, at), 'node_modules', name))
}
const LICENSE_FILE = /^(licen[cs]e|copying)(\.(md|txt))?$/i
const licenses = new Map()
for (const dir of pkgDirs) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const key = `${pkg.name}@${pkg.version}`
  if (licenses.has(key)) continue
  const file = fs.readdirSync(dir).find((n) => LICENSE_FILE.test(n))
  const text = file ? fs.readFileSync(path.join(dir, file), 'utf8').trim() : NO_LICENSE_FILE[pkg.name]
  if (!text) throw new Error(`${key} (${path.relative(root, dir)}) has no license file to carry in stage/THIRD_PARTY_LICENSES.txt; add it to NO_LICENSE_FILE in demo/build.mjs with its source`)
  const license = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type || 'see text'
  licenses.set(key, { name: pkg.name, version: pkg.version, license, text })
}
const rule = '='.repeat(80)
const entries = [...licenses.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
const notices = [
  'Third party licenses for stage/index.html',
  '',
  'The registry gallery page (stage/index.html) is one file that bundles code from the npm packages below.',
  'Each entry is that package\'s own license file, as installed. Generated by demo/build.mjs; do not edit.',
  '',
  `${entries.length} packages: ${entries.map((e) => `${e.name}@${e.version}`).join(', ')}`,
  ...entries.flatMap((e) => ['', rule, `${e.name} ${e.version} (${e.license})`, rule, '', e.text]),
  ...(legal.length ? ['', rule, 'License comments found in the bundled code', rule, '', ...legal] : []),
].join('\n') + '\n'
fs.mkdirSync(path.join(root, 'stage'), { recursive: true })
fs.writeFileSync(path.join(root, 'stage/THIRD_PARTY_LICENSES.txt'), notices)

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Registry demo</title>
<!-- Bundles third party code. License texts: THIRD_PARTY_LICENSES.txt next to this page. -->
<style>${css}</style>
<style>${tw.css}</style>
</head>
<body>
<div id="root"></div>
<script>${js.replace(/<\/script/g, '<\\/script')}</script>
</body>
</html>
`
fs.writeFileSync(path.join(dist, 'index.html'), html)
console.log('built', path.join(dist, 'index.html'), (html.length / 1024).toFixed(0) + ' KB')
console.log(`licenses of ${entries.length} bundled packages written to`, path.join(root, 'stage/THIRD_PARTY_LICENSES.txt'))
