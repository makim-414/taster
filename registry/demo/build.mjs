// Builds demo/dist/index.html as one self-contained file: Tailwind CSS + esbuild bundle inlined.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
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
})

let js = ''
let css = ''
for (const f of out.outputFiles) {
  if (f.path.endsWith('.js')) js = f.text
  if (f.path.endsWith('.css')) css = f.text
}

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Registry demo</title>
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
