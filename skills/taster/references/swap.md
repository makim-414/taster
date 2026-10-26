# Swap

Goal: replace each diagnosed spot with a pattern that does the same job without the generated look, in the user's
own code, and prove it with a second detector run.

## Order

1. Fix tokens first. Many findings share one cause (a purple accent, a global letter spacing, a radius scale).
   Changing the token removes them all at once and keeps the brand coherent.
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

## Report

Before and after captures side by side, the list of rules cleared, and anything left with a reason (for example
"kept the gradient on the logo, it is part of the brand mark").
