# Registry

Portable React and TypeScript components with neutral design tokens. There is no package to
install and no other CLI to set up: `taster add` copies the files a component needs into your app.

144 components, one of them the keyboard hook `blocks/use-hotkeys`, MIT licensed. Every entry is listed in
`registry.json` with its file, category, npm dependencies and credit.

## Add a component to your app

The npm package is not published yet, so the CLI runs from a clone of this repository. Clone it once, then run the
command from your app folder:

```bash
git clone https://github.com/makim-414/taster.git /path/to/taster   # once
npm ci --prefix /path/to/taster/engine                              # once
node /path/to/taster/engine/cli.mjs add blocks/button blocks/dialog --dir src/components/taster
node /path/to/taster/engine/cli.mjs add --list
```

It follows every relative import (helpers such as `_cn.ts` and `_url.ts`, other components, icons), adds
`tokens.css`, `tailwind-preset.cjs` and `THIRD_PARTY_NOTICES.md`, puts Taster's own MIT license next to them as
`TASTER_LICENSE.txt`, prints the npm packages to install, and leaves any file you changed alone unless you pass
`--overwrite`. `--dir` is relative to the folder you run it in. To read the component files from the hosted copy
instead of the clone, add `--from https://taster-six.vercel.app` (the same files, served at `/r/<id>.json`;
`/r/index.json` lists the ids); the command itself still runs from the clone. The npm package will replace the clone
once it is published (`RELEASE.md`).

## Copy a component by hand

1. Tokens first. Components read CSS variables only, so nothing renders correctly without them.
   - Copy `src/tokens.css` and import it once at your app root.
   - Copy `src/tailwind-preset.cjs` and add it to your Tailwind v3 config:
     `presets: [require('./tailwind-preset.cjs')]`. It maps classes such as `bg-bg-elev`,
     `text-text-muted`, `border-border-soft` and `text-label` to the variables.
   - Optional: `src/themes/light.css` (activate with `<html data-theme="light">`) and
     `src/base.css` (only needed for Calendar and DatePicker, import it after
     `react-day-picker/style.css`).
2. Copy the shared helper `src/blocks/_cn.ts` (a tiny className joiner).
3. Copy the component file, for example `src/blocks/button.tsx`. If its header has an
   `Upstream license:` line, keep that line: it is the copyright notice the upstream MIT license
   asks you to carry. The full texts are in `THIRD_PARTY_NOTICES.md`. Keep Taster's own notice
   (the root `LICENSE`) with the copied files too.
4. Install the npm packages listed in that component's `deps` in `registry.json`.
   An entry in `deps` that looks like `blocks/use-hotkeys` is another registry component,
   copy it too.
5. Copy every file the component imports by a relative path. `blocks/coverflow-carousel`,
   `blocks/sensitive-input`, `blocks/session-list` and `marketing/workflow-section` also need
   `src/icons/index.tsx`. Every component that takes a URL in a prop also needs `src/blocks/_url.ts`
   (see below).
6. The components that move read `prefers-reduced-motion` through `src/motion/_motion.ts` (reduced
   motion, in-view and keyframe helpers, no dependency) and hold still under it, so they need that
   file too: everything under `motion/`, `marketing/pricing-cards`, `marketing/reveal-faq`,
   `marketing/step-showcase`, `marketing/workflow-section` (its particle orb stops),
   `blocks/appearance-picker`, `blocks/banner-hero`, `blocks/citations`,
   `blocks/curved-stream-hero`, `blocks/spotlight-card`, `content/prose`, `content/article` (which
   also needs `content/prose`), `media/snap-carousel`, `chat/tool-call`, `chat/agent-status` and
   `scene/point-globe`. `blocks/skeleton` pulses only under `motion-safe`.
7. The page section, content, media, commerce, chat and scene components (`marketing/*`,
   `content/*`, `media/*`, `commerce/*`, `chat/*`, `scene/*`) have no npm dependency and draw their
   own small line glyphs inline. `marketing/photo-hero`, `media/before-after` and
   `media/gallery-lightbox` read `--on-scrim`, `--on-scrim-muted` and `--on-scrim-ink` from
   `tokens.css`.
8. Items in lists that can mix languages (feature rows, FAQ, products, cart lines, carousel items,
   chat messages, case studies) take a `lang` field. Set `lang="ko"` on Korean items so the Korean
   type rules in `tokens.css` (13px floor, words kept whole) apply to them.

Example for a button and a dialog:

```bash
cp src/tokens.css src/tailwind-preset.cjs your-app/src/
cp src/blocks/_cn.ts src/blocks/button.tsx src/blocks/dialog.tsx your-app/src/blocks/
npm i @radix-ui/react-dialog
```

## Links, markup and names

- Every component that takes a URL in a prop (a link, a form action, a video address) passes it
  through `safeHref` in `src/blocks/_url.ts`. Relative paths, `#fragments`, `?queries` and absolute
  `http:`, `https:` and `mailto:` URLs pass; anything else (`javascript:`, `data:`, an unknown
  scheme) is dropped and the component draws its plain element instead of a link. Add a scheme to
  `SCHEMES` there if your links need one, such as `tel`.
- `content/prose` writes its `html` prop into the page as is. Give it only markup you trust, and put
  anything a user or another site wrote through a sanitizer such as DOMPurify first; text you do not
  need as HTML goes in as children.
- `BarChart` (`blocks/bar`), `Sparkline` (`blocks/spark`) and `Progress` need a name: `label`,
  `aria-label` or `aria-labelledby`. `PopoverContent` (`blocks/popover`) needs `aria-label` or
  `aria-labelledby`. Without one, TypeScript reports an error.

## Theming

Override `--brand` (and the `--chart-*` ramp if you want colored data) in your own stylesheet.
The alias layer (`--bg`, `--text`, `--accent`, ...) follows. Semantic colors for success,
warning and danger stay on the small status dot or icon only.

## Develop

```bash
npm ci
npm run typecheck     # tsc, must exit 0
npm run build-demo    # writes demo/dist/index.html (one self contained file)
npm run test-render   # builds the demo, then the headless render gate, prints RENDER OK
node test-a11y.mjs    # keyboard focus, accessible names and reduced motion, prints A11Y OK
node test-injection.mjs  # no component runs what its props hold
```

The demo page renders every registry entry in a `data-registry-id` wrapper. The render test
fails on any page error, any console error, or any registry id without a rendered element. From the
repository root, `node scripts/gates.mjs browser` runs these with the rest of CI's browser job.

### Bringing in a component from elsewhere

Do not install it; redraw it with the tokens. Record each one in a three column table (component, source and author, what we changed) and in `THIRD_PARTY_NOTICES.md` with its own license, checked per component. Replace motion libraries with CSS keyframes, make every control 44px on touch screens, never color a remove action red by default, keep only the structure of a tinted pill (not the tint), and leave out borders with a light running around them (COL-07, BG-01).

## License

MIT, the root `LICENSE` (`add` copies it as `TASTER_LICENSE.txt`). Components that follow other
projects name the credit in `registry.json` and in their file header, and `THIRD_PARTY_NOTICES.md`
has the full license texts. The npm packages bundled into `stage/index.html` are listed with their
licenses in `stage/THIRD_PARTY_LICENSES.txt`.

## Stage and previews

`stage/index.html` is the demo page as one file; `?only=<id>` shows one component and `?look=<json>` sets its theme and
tokens. `previews/` holds a still of each component, light and dark. The gallery on the web and the MCP tools
`browse_components` and `preview_component` use both. After changing a component or its demo, run
`npm run build-stage`; `scripts/validate.mjs` fails until you do.
