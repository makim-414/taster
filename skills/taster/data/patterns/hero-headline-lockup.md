---
id: hero-headline-lockup
name: Hero headline lockup
category: hero
uses: [introduce-the-product]
surfaces: [landing]
replaces: [AC-01, CMP-01, TYP-04, TYP-05]
components: []
inspiration: []
status: stable
---

## When to use

Use it for every hero, as the text block that sits next to or above whatever visual you choose. It is the part of the page most often over-decorated: a pill, a kicker, a six-line headline and a paragraph of support. The lockup is deliberately small so the visual and the first action do the work.

It stands alone only when the page has no visual yet, such as a waitlist or a text-first product. Even then it should be left aligned and short.

## Anatomy

Three parts, in this order, with nothing above them.

1. Headline: one idea, 3 to 12 words, set at `--t-display` on desktop and `--t-h1` on mobile. Sentence case. Normal letter-spacing or at most -0.02em.
2. Support sentence: one plain sentence, 14 to 25 words, `--t-body` or `--t-title`, `text-muted`. It says who it is for or how it works, not another slogan.
3. Action: one solid button with a verb that names the result ("Run a free report"). An optional text link beside it. A single line of fine print under it if there is a real condition, such as "No card needed".

Vertical rhythm: headline to support is `--sp-4`, support to action is `--sp-8`. Max width of the block is about 34 characters per line for the headline and 60ch for the support.

## Do

- Write the headline as a claim only this product can make. Test it: swap in a competitor name; if it still reads true, rewrite.
- If there is news, put it in one line of body text under the buttons, with a date and a link.
- Keep it left aligned. Center only for a single-line manifesto page.
- Set the headline in one typeface and one color. Emphasis comes from weight or from rewriting.
- Give the button a concrete label. "Get started" is the weakest label there is.
- Check the headline at 360px width: it should wrap to four lines at most.

## Don't

- Do not put a rounded "New: ..." announcement pill above the headline (CMP-01).
- Do not set a small uppercase tracked kicker such as "THE FUTURE OF X" over the headline (AC-01).
- Do not set a whole sentence of eight or more words at 64px and above (TYP-04). Large type is for short phrases.
- Do not tighten large type so the letters touch. -0.04em and below hurts reading (TYP-05).
- Do not add a second and third button. One action, one fallback link at most.
- Do not fill the support line with parallel fragments like "Faster. Smarter. Better."

## Swap recipe

Slop version: kicker, pill, a giant sentence with crushed tracking.

```css
/* before: AC-01, CMP-01, TYP-04, TYP-05 */
.kicker { text-transform: uppercase; letter-spacing: 0.2em; font-size: 12px; }
.pill   { border-radius: 999px; background: rgba(120, 80, 255, .12); color: #7c5cff; padding: 4px 12px; }
.hero h1 {
  font-size: clamp(56px, 8vw, 96px);   /* a 12 word sentence at 96px */
  letter-spacing: -0.06em;
  line-height: 0.95;
}
```

Fixed version: delete the kicker and pill, shorten the headline, restore tracking.

```tsx
<div className="max-w-[560px]">
  <h1 className="text-h1 lg:text-display font-semibold tracking-[-0.02em] leading-[1.1] text-text">
    Every invoice matched to a bank line
  </h1>
  <p className="mt-4 max-w-[60ch] text-title text-text-muted">
    Upload a statement and the ledger. Unmatched lines come back as a short list you can fix in one pass.
  </p>
  <div className="mt-8 flex items-center gap-4">
    <Button size="lg">Match my first file</Button>
    <a className="text-body text-text-muted hover:text-text" href="/pricing">See pricing</a>
  </div>
  <p className="mt-4 text-label text-text-subtle">Free up to 200 lines. Added a CSV export on 21 Oct.</p>
</div>
```

If the news line is not worth a sentence, delete it. A pill that stays "New" for a year is decoration.

## Tokens

- Type: `--t-display` 36px (desktop) and `--t-h1` 30px (mobile) for the headline, `--t-title` 16px for support, `--t-sm` 12px for fine print. Weight `--w-semi`. Line height `--lh-tight` (1.1).
- Tracking: default, or -0.02em. Never below -0.03em.
- Space: `--sp-4` headline to support, `--sp-8` support to action.
- Color: `--text` for the headline, `--text-muted` for support, `--text-subtle` for fine print. The only filled element is the solid button (`--accent`, `--accent-fg`).
- Radius: `--r-md` on the button. No pill radius anywhere in the lockup.
