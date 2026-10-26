# Brand

Goal: whatever Taster swaps in or rebuilds wears the owner's brand, not the repository's neutral defaults. This step
sits in the middle of every route: after Diagnose on an existing site, and right after the opening questions for a
new one.

## Existing site: absorb it

Call `brand_theme { target }` on the original address (or `node engine/cli.mjs <url> --brand --out <dir>`). It reads
the page the same way `extract_content` does and returns:

- `tokens`: the overrides it chose.
  - `--brand`: the solid color the site puts on its own buttons and links. A gradient is not a brand color; when
    there is no solid one, the neutral accent stays and a note asks for the real color.
  - `--accent-fg`: white or near black, whichever reads better on the brand color.
  - `--font`: the site's typeface when it was a choice. A stock fallback (Arial, Times, system UI) or one of the
    faces generated pages default to (Inter, Geist, Space Grotesk and the rest of TYP-01 and TYP-02) is replaced
    with the Taster default, IBM Plex, and the note says how to put it back if it really is the brand's face. A
    Hangul family is always in the stack.
  - `--success`, `--danger` (and `--destructive`, `--delta-up`, `--delta-down` with the same values): meaning
    colors fitted to the brand. Readable on the page (lighter on a dark page, darker on a light one) and moved at
    least 35 degrees of hue away from the brand color, so a status dot never reads as brand decoration.
- `css`: a `:root` block. Save it as `theme.css` and load it after `registry/src/tokens.css`.
- `notes`: one line per choice, with the reason. Show them to the user.

Then confirm with the owner in one message: the brand color, the typeface decision, and the logo file. Never redraw
a logo or set it in a font; if the site only has a text logo, ask for the file.

## New site: ask for it

With the opening questions, ask for the brand color (a hex value), the typeface they use, and the logo file. If
they have any existing page (an old site, a store page, a deck exported to HTML), run `brand_theme` on it and start
from that. If they have nothing, keep the Taster defaults and say so.

## How the theme is used

- Swap: put `theme.css` (or the same values in their own token file) in place first. Many findings share one cause
  and change with the tokens; the brand color slot replaces the purple accent, the typeface replaces the default AI
  face.
- Rebuild and Build: every component reads the alias tokens, so loading `theme.css` after `tokens.css` is enough.
  Do not type brand values into components.
- Status: a dot or a mark for a real outcome uses `--success` or `--danger`, flat and still. The detector (AC-08)
  passes a dot in exactly these page colors and still flags a dot in any other hue, or one that glows or pulses.
  States that are not outcomes (queued, processing, draft) stay neutral and say the state in words.

The worked example in `examples/rebuild/` loads a `theme.css` absorbed from its `before.html`, and its check fails if
the file drifts from what `brand_theme` gives.
