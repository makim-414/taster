# Swap

Goal: replace each diagnosed spot with a pattern that does the same job without the generated look, in the user's
own code, and prove it with a second detector run.

## Order

0. Absorb the brand ([brand.md](brand.md), `brand_theme`) and make the design system with the builder
   ([system.md](system.md), `design_system`, `tune_system`) if you have not yet. The system decides the brand color,
   the typeface, the meaning colors and the tone (spacing, radius, type scale, shadows, motion, borders) every swap
   below uses.
1. Fix tokens first: put the system's `theme.css` (or the same values in their token file) in place. Many findings
   share one cause (a purple accent, a global letter spacing, a radius scale). Changing the token removes them all at
   once and keeps the brand coherent.
2. Then structural swaps, one rule at a time, highest severity first.
   For icon findings (ICO-01 to ICO-04, CMP-03, AC-11, AC-03), sort every icon on the page into its slot with
   `data/patterns/icon-placement.md` before touching a glyph. Remove the icons whose slot fails its test, then bring
   the rest onto one set and one stroke weight. Restyling an icon that should not be there does not clear the rule.
3. Then copy (manual rules), last, and only where the user agrees.

## For each finding

1. Look up the rule in `data/rules.json`, read `fix_patterns`.
2. Open each `data/patterns/<id>.md`. Pick the one whose "When to use" matches this spot.
3. Apply the "Swap recipe". It is written at the CSS or JSX level. Keep the user's content, brand color and
   framework.
4. If the pattern lists `components`, copy the component from `registry/src/` (see `data/registry.json` for the
   file) together with the tokens it uses. Rename classes to the user's conventions if they have them.
5. Re run detect.js at both widths. The finding must be gone. If a new finding appears, you introduced it; fix it
   before moving on.

6. Lint the files you touched (`taster lint <files>`, or `node engine/lint.mjs <files>`). It reads the source form of
   the same rules (tinted pills, transition-all, hard-coded colors, pixel one-offs) without a browser, so a swap that
   reintroduced one shows up even where the page did not render it. Leave a `taster-allow <reason>` only where the
   user asked for the exception.

## Report

Before and after captures side by side, the list of rules cleared, and anything left with a reason (for example
"kept the gradient on the logo, it is part of the brand mark").

## More than one screen

Swap one screen at a time ([screens.md](screens.md)), with the route set to `swap` so each screen's output is its
own source. Propose the swaps for a screen, swap only after the builder's yes, then check it: zero findings, and zero
drift in `check_consistency` against the screens already swapped and the tokens. Shared components fixed on one
screen usually fix the next; the consistency check shows where they did not. A finding only a markup change can
clear (a symbol inside link text, copy with an em dash) is recorded as an accepted exception with the builder's
OK, never left out of the counts ([screens.md](screens.md#accepted-exceptions)).
