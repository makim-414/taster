# Third party notices

Taster is MIT licensed (see `LICENSE`). This file lists what the repository carries from other people and
where each notice lives. npm packages installed as dependencies of the engine, the web app and the registry
keep their own license files in `node_modules` and are not repeated here.

| What | Where | Notices |
|---|---|---|
| Code and API shapes the component registry follows (shadcn/ui, Radix, Magic UI, motion-primitives, cult-ui, beUI, 21st.dev listings and others), and the design references no code was taken from | `registry/src/` | [`registry/THIRD_PARTY_NOTICES.md`](registry/THIRD_PARTY_NOTICES.md) |
| npm packages bundled into the prebuilt gallery page | `registry/stage/index.html` | [`registry/stage/THIRD_PARTY_LICENSES.txt`](registry/stage/THIRD_PARTY_LICENSES.txt), written by `registry/demo/build.mjs` on every stage build |
| The home page's before/after slider | `web/app/compare-reveal.tsx`, `web/app/compare-spring.ts` | Motiq, below |
| Noto Sans KR, latin slice | `web/app/fonts/` | SIL Open Font License 1.1, [`web/app/fonts/OFL.txt`](web/app/fonts/OFL.txt) |
| The home page comparison pictures | `web/public/compare/` | Taster's own example, below |
| Code of conduct | `.github/CODE_OF_CONDUCT.md` | Adapted from the Contributor Covenant 2.1, credited in the file |

## Motiq

Source: Compare Reveal by Mahammad Rustamov (https://motiq.dev/components/compare-reveal), from
https://github.com/RMahammad/motiq, picked from 21st.dev.
License: MIT (https://github.com/RMahammad/motiq/blob/main/LICENSE).

Used for: the before/after slider on the home page, `web/app/compare-reveal.tsx`, with its spring and intro
sweep in `web/app/compare-spring.ts`. Kept: the spring constants, clamp, lerp and the cubic ease, the spring that
follows the pointer, the one-time intro sweep, keyboard control and double-click to centre. Changed: plain CSS
on the registry tokens, no glow, no blurred glass chips, no all-caps labels, and the animation loop stops while
the divider is at rest.

```text
MIT License

Copyright (c) 2026 Mahammad Rustamov

Permission is hereby granted, free of charge, to any person obtaining a copy
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
SOFTWARE.
```

## The home page comparison pictures

`web/public/compare/before.jpg`, `after.jpg` and their 780px wide copies are renders of Taster's own example,
`examples/rebuild/before.html` and `examples/rebuild/after.html`, made by `web/scripts/compare/render.mjs`.
Acme Ledger, the product on them, is made up: the pictures show no real site and no third party name, logo or
trademark. They are part of this repository and covered by its MIT license. The emoji in `before.jpg` are drawn
with Noto Color Emoji (SIL Open Font License 1.1), loaded only while rendering; the font is not part of this
repository.
