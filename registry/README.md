# Registry

Portable React and TypeScript components with neutral design tokens. There is no package to
install and no other CLI to set up: `taster add` copies the files a component needs into your app.

143 components and one keyboard hook, MIT licensed. Every entry is listed in `registry.json` with its file, category,
npm dependencies and credit.

## Add a component to your app

```bash
node engine/cli.mjs add blocks/button blocks/dialog --dir src/components/taster
node engine/cli.mjs add --list
```

It follows every relative import (helpers such as `_cn.ts`, other components, icons), adds `tokens.css`,
`tailwind-preset.cjs` and `THIRD_PARTY_NOTICES.md`, prints the npm packages to install, and leaves any file you
changed alone unless you pass `--overwrite`. Without a clone, read from the hosted copy:
`--from https://taster-six.vercel.app` (the same files, served at `/r/<id>.json`; `/r/index.json` lists the ids).

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
   asks you to carry. The full texts are in `THIRD_PARTY_NOTICES.md`.
4. Install the npm packages listed in that component's `deps` in `registry.json`.
   An entry in `deps` that looks like `blocks/use-hotkeys` is another registry component,
   copy it too.
5. `marketing/workflow-section` also needs `src/icons/index.tsx`.
6. Everything under `motion/`, and `marketing/pricing-cards`, `marketing/reveal-faq` and
   `marketing/step-showcase`, also need `src/motion/_motion.ts` (reduced motion, in-view and
   keyframe helpers, no dependency). Each of them honors `prefers-reduced-motion`.
7. The page section, content, media, commerce, chat and scene components (`marketing/*` other than
   the four above, `content/*`, `media/*`, `commerce/*`, `chat/*`, `scene/*`) have no npm
   dependency and draw their own small line glyphs inline. These also need `src/motion/_motion.ts`:
   `content/prose`, `content/article` (which also needs `content/prose`), `media/snap-carousel`,
   `chat/tool-call`, `chat/agent-status`, `scene/point-globe`. `marketing/photo-hero`,
   `media/before-after` and `media/gallery-lightbox` read `--on-scrim`, `--on-scrim-muted` and
   `--on-scrim-ink` from `tokens.css`.
8. Items in lists that can mix languages (feature rows, FAQ, products, cart lines, carousel items,
   chat messages, case studies) take a `lang` field. Set `lang="ko"` on Korean items so the Korean
   type rules in `tokens.css` (13px floor, words kept whole) apply to them.

Example for a button and a dialog:

```bash
cp src/tokens.css src/tailwind-preset.cjs your-app/src/
cp src/blocks/_cn.ts src/blocks/button.tsx src/blocks/dialog.tsx your-app/src/blocks/
npm i @radix-ui/react-dialog
```

## Theming

Override `--brand` (and the `--chart-*` ramp if you want colored data) in your own stylesheet.
The alias layer (`--bg`, `--text`, `--accent`, ...) follows. Semantic colors for success,
warning and danger stay on the small status dot or icon only.

## Develop

```bash
npm install
npm run typecheck     # tsc, must exit 0
npm run build-demo    # writes demo/dist/index.html (one self contained file)
node test-render.mjs  # headless render gate, prints RENDER OK
```

The demo page renders every registry entry in a `data-registry-id` wrapper. The render test
fails on any page error, any console error, or any registry id without a rendered element.

## What is not here yet

Text effects, visual effects and particle components are left out of this first cut. A short
list of motion components is also left out until their source and license are clear, see
`THIRD_PARTY_NOTICES.md`.

## License

MIT. See `THIRD_PARTY_NOTICES.md` for the credits that come with it.

## Stage and previews

`stage/index.html` is the demo page as one file; `?only=<id>` shows one component and `?look=<json>` sets its theme and
tokens. `previews/` holds a still of each component, light and dark. The gallery on the web and the MCP tools
`browse_components` and `preview_component` use both. After changing a component or its demo, run
`npm run build-stage`; `scripts/validate.mjs` fails until you do.
