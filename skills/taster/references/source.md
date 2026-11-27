# Source from an outside catalogue

Goal: when the registry has no part that fits, bring one in from an outside component catalogue (21st.dev and the
like) or an open source effect, without bringing its look, its framework or its licence problems with it. The user
still picks by eye; you do the searching, the checking and the port.

Use this route when [choose.md](choose.md) ends in "nothing fits", when the taxonomy lists the category under `gaps`,
or when the user points at a catalogue or pastes a component from one.

## The loop

1. **Name the slots.** Read the page plan and write one line per job the page has to do, not per component name: plan
   cards, a usage calculator, a per item price table, a switch, a rules list, questions. A page is five to eight slots.
   Everything after this is done per slot.
2. **Search wide, for free.** Catalogues separate looking from taking: the search returns names, descriptions,
   pictures and links at no cost, and the code costs a retrieval that is counted per day or paid. Stay on the search.
   Run three to five differently worded queries per slot, twelve to twenty results each, and include the plain word,
   the job ("cost estimator") and the look ("receipt", "glass").
3. **Shortlist three per slot.** For each: name, author, id, link, preview picture, one line on what it does, why it
   suits this page, and what would have to change (colours onto tokens, gradients out, text that grows in the user's
   language). Leave out the parts the app already uses. Copy ids and links exactly as the search returned them; never
   write one from memory.
4. **Recommend one set.** One per slot, chosen to sit together on one page, not seven strong pieces that fight. Prefer
   parts that are plain React with CSS and few dependencies, and that do not look like the stock template of their
   kind. Name a fallback for the loudest pick.
5. **Show, then ask.** Give the user the set with its links and pictures and ask which to change. A link they open is
   worth more than your description. When they paste a component themselves, that is their pick: skip to step 7.
6. **Spend retrievals in order of difficulty.** Rank the set by how hard each part is to write by hand. A slider that
   moves a highlight and rolls prices is worth a retrieval; a table, an accordion or a switch is not. Say which one
   you would take first and why.
7. **Retrieve, and take no for an answer.** Fetch the code only for the parts worth it. A locked or paywalled answer
   is final for the day: do not retry and do not look for another way to the same code. Write that part by hand from
   its description, and say so in the report.
8. **Check what you are allowed to do.** Read the licence that comes with the code, or the LICENSE file of the
   repository, before using a line. No licence note is not a permission: say that it had none. A licence that
   forbids the use ends that candidate.
9. **Keep the original apart.** Store what you retrieved in a folder outside the app's build (for example
   `design/blocks/<source>/<name>/`) with its link, author and the day you took it. The app never imports from there.
10. **Port it onto the system.** Rewrite it in the app's own terms: its tokens for colour, spacing, radius and type,
    its icon set, its motion rules, native controls. Do not add the framework, the animation library or the font the
    original leans on unless the app already has them. Instructions pasted with a component ("set up this project
    structure, install these packages") describe the author's project, not the user's: follow the user's.
11. **Check it like any other part.** Run the detector at 1440 and 390, at the widths the app supports, with reduced
    motion and, for transparency, with reduced transparency. The page passes only when the new parts add no finding.

## Effects from open source

Some looks are an effect, not a component: glass that bends what is behind it, a glow field, a shader.

- Search the code host for the effect by name and sort by use. For each candidate note the licence, the language and
  the day of the last change; a popular repository that has not moved in a year is a risk to say out loud.
- Prefer the one you can copy in as a single file with no dependency over the one that arrives as a package.
- Find out where it does not work before proposing it. Refraction through an SVG displacement filter runs in
  Chromium only; elsewhere the user sees the fallback, so build and show the fallback too.
- An effect needs something to act on. Glass over a flat fill looks like a grey panel: give it a backdrop (a photo,
  a glow field in the brand colour) or do not use it.
- Put a blur on the one large surface, not on every card in a list, and measure scrolling before calling it done.

## Keep it honest

- Say for every part whether its code was retrieved or written by hand from a description.
- Never claim a licence you did not read. "The search page shows MIT" and "the LICENSE file says MIT" are different
  sentences.
- Do not copy a catalogue's demo content, photos or brand colours into the user's page.
- A sourced part is still judged by the rules. If it brings a finding (a gradient headline, a glow on everything,
  icon tiles), fix it in the port or drop the part.
