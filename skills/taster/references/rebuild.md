# Rebuild

Goal: the same site, saying the same things to the same people, without the generated look. Use this route when
the user has the address but not the source: a page made in a hosted builder, a template they cannot edit, or
code they lost. If the source is in the workspace, use [swap.md](swap.md) instead; a swap keeps their stack and
history.

## 1. Diagnose the original

Run Diagnose on the address at 1440 and 390 ([diagnose.md](diagnose.md)). Keep the outlined captures; they are
the "before" in your report. Note which findings come from the brand itself (a logo gradient, a brand typeface)
so you do not strip what the owner chose on purpose. Ask when you are not sure.

## 2. Read the content

Call `extract_content { target }` (or `node engine/cli.mjs <url> --extract`). It returns, in reading order:

- `sections`: each h1 or h2 with the text, subheadings, lists, actions (buttons and button-like links with their
  targets), images, quotes and forms under it.
- `nav` and `footer` links.
- `brand`: name or logo, the most used solid color on actions, heading and body fonts, and whether the page is dark.
- `title`, `description` and `lang`.

Emoji and pictographs are already removed; they were decoration, not content.

## 3. Absorb the brand

Call `brand_theme { target }` on the original and save its `css` as `theme.css` ([brand.md](brand.md)). It carries
the brand color and the typeface when they were real choices, and fits success and failure colors to them. Show its
notes, and confirm the brand color, typeface and logo file with the owner.

## 4. Decide what stays

Keep: every heading, every paragraph that carries a claim or a fact, every action and where it goes, nav and
footer links, images the owner made or owns, and the logo. The brand color and typeface are already in `theme.css`.

Drop: decoration the detector flagged (blobs, glows, gradient text, tinted pills, icon tiles, tracking wide
eyebrows), duplicate calls to action that go to the same place, placeholder copy.

Ask before you change claims. Numbers without a source ("10x faster"), invented testimonials and logo walls are
the owner's to keep or cut. Flag them in your report; do not silently rewrite or delete them.

## 5. Map sections to uses

For each section, name the use it serves from `taxonomy.uses` (introduce the product, show how it works, prove
trust, compare plans, answer doubts, ask for the action ...). Then pick one pattern per use with
`list_patterns { surface, use }` and read it with `get_pattern`. Prefer patterns with registry components.

Do not keep a layout just because the original had it. Three equal icon cards become whatever the content needs:
a short list, a table, a single strong example.

## 6. Choose where it will live

Ask once: "Where should the new site live?" If the user has no preference, build:

- a plain HTML and CSS page with `registry/src/tokens.css` for a quick preview they can open, and
- the same page as React components from the registry when they will keep developing it.

Bring the brand in through tokens only: load `theme.css` after `registry/src/tokens.css`, and keep the logo as the
owner's file. One accent color at most.

## 7. Check and compare

1. Run Diagnose on the rebuild at 1440 and 390. Every measured rule must be at zero. Fix and re run until it is.
2. Run `extract_content` on the rebuild and compare it with the original: every heading, action label and nav
   item from the original must still be there. List anything you removed on purpose and why.
3. Report: the two captures side by side at each width, the rules cleared, the content kept (for example "14 of 14
   headings and actions kept"), the claims you flagged, and what you could not check.

The repository has a worked example in `examples/rebuild/` with its own check
(`node engine/scripts/check-rebuild-example.mjs`).
