// What a visitor runs to put a component in their own app, for the component pages and the board.
// Until the CLI is on npm, the add command runs from a clone of the repository: cloned once next to the app folder with
// the engine installed, it runs from inside the app and reads the component files from this site.
import { SITE } from './page-meta';

export const CLONE_LINE = 'git clone https://github.com/makim-414/taster.git && npm ci --prefix taster/packages/engine';

export const addLine = (id: string) => `node ../taster/packages/engine/cli.mjs add ${id} --from ${SITE} --dir src/components/taster`;

// The components are drawn with Tailwind classes that the preset maps to the tokens. Tailwind v3 reads this config as
// is; v4 reads it through @config from the stylesheet in src/ that loads Tailwind.
export const TAILWIND_CONFIG = `// tailwind.config.cjs
module.exports = {
  presets: [require('./src/components/taster/tailwind-preset.cjs')],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
};`;

export const TAILWIND_V4 = `@import "tailwindcss";
@config "../tailwind.config.cjs";`;
