# Choose

Goal: the user picks the look by eye, in a back and forth, the way they would browse a reference site. You narrow the
options and do the work; they decide.

## Tone first

When the look is still open (a new build, or a rebuild the owner wants to move away from), settle the tone before the
parts. Ask in one line where it should sit: more commercial or more brand personality, calmer or louder, and whether a
genre fits (geek and developer, editorial and serif, illustration and play, product photo hero, product screen hero,
utility and density). Then call `pick_tone` with that spot (`x` from commerce 0 to brand personality 1, `y`
from minimal 0 to expressive 1, `genre`), or with `like` set to a reference they named.

- Show every reference picture with its number, name and praise link, the parts picture, and the tone page link. Say
  that the references set the direction and the parts picture is what Taster builds; it will not copy the references.
- A reference that comes back as a link only answered with a bot check or a block page. Leave it at the link; never
  try to get past it.
- Ask which reference is closest or which way to move, then call `pick_tone` again. On the tone page they drag the
  spot themselves and paste back a sentence such as "톤 지도에서 브랜드 개성 80, 화려 18 ... 를 골랐어". Treat that as
  their answer.
- When they agree, carry the tokens into `preview_component` and the build, and keep `axes` next to the brand notes:
  it is the builder intent a design system takes.

## The loop

1. **Ask for the job, not the look.** One line is enough: which block, and for what. Skip this when they already said.
2. **Show options.** Call `browse_components` with their words as `query`, plus `surface` or `use` when you know them,
   `limit` 3 to 6, and their `brand` color if you have it. Show every picture with its number and name, and give the
   board link. Do not paste code, JSON or a long comparison.
3. **Ask one question.** "Which number? Or tell me what is off about all of them." Then stop and wait. Do not write code
   in the same turn.
4. **Read the answer and go again.**
   - A number: go to step 5.
   - "Like 2 but calmer", "something with a photo": search again from what they said, leave out what they turned down,
     and say in one line what you changed.
   - Nothing fits: say so, and offer to build it from the closest pattern (`get_pattern`).
5. **Try it in their brand.** Call `preview_component` with the pick and their color or the `tokens` from `brand_theme`.
   At `width` 390 too if the phone matters. Show it and ask whether it is right.
6. **Build.** `get_component` for the choice, then the swap or build route as usual, then diagnose.

## The web gallery

Every link goes to the live gallery, where the component really runs:

- `/components` lists everything with filters, and lets them try a color or read the brand from a site address.
- `/components/<id>` runs one component to click on, at desktop, tablet and phone width, with the install line and code.
- `/tone?x=0.8&y=0.18&genre=geek` is the tone map: a pad to drag, a genre to narrow it, the nearest real sites with their first screens, and
  three Taster parts running in that spot's tokens, with a sentence to paste back.
- `/board?ids=a,b,c&brand=hex&theme=light` puts candidates side by side. They press a pick button and get a sentence to
  paste back to you, such as "2번 blocks/card 를 골랐어". Treat that as their answer, and act on it.

Offer the board when there are several real options, or when they are on a phone.

## Keep it honest

- A picture is the default look with sample content. Say that the real one will carry their content and brand.
- Never recommend from the file name. If you recommend a number, say why in one line, in terms of their page.
- On the hosted server `preview_component` has no browser to render in: it returns the default still and a live link
  that opens in their brand. Say the still is the default look and send the link.
- Skip this loop for changes they fully specified, such as "make this button smaller".
