# Choose

Goal: the user picks the look by eye, in a back and forth, the way they would browse a reference site. You narrow the
options and do the work; they decide.

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
- `/board?ids=a,b,c&brand=hex&theme=light` puts candidates side by side. They press a pick button and get a sentence to
  paste back to you, such as "2번 blocks/card 를 골랐어". Treat that as their answer, and act on it.

Offer the board when there are several real options, or when they are on a phone.

## Keep it honest

- A picture is the default look with sample content. Say that the real one will carry their content and brand.
- Never recommend from the file name. If you recommend a number, say why in one line, in terms of their page.
- If `preview_component` is not available (the hosted server has no local render), use its still and live link.
- Skip this loop for changes they fully specified, such as "make this button smaller".
