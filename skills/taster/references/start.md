# Start

Every Taster session begins with one question. Ask it before you open a browser or write any code, in the
user's language:

> Is this a site that already exists, or are we building a new one?

In Korean: "이미 있는 사이트인가요, 아니면 새로 지을까요?"

Only skip the question when the user's first message already answers it in so many words ("here is my site, fix
it", "build me a landing page for ..."). Then say which path you are taking in one line and go.

## Already exists

1. Ask for the address: a live URL, a local dev server, or an HTML file.
2. Find out whether you can edit its source. Look in the workspace first (a `package.json`, an `index.html`, a
   framework config whose pages match the URL). If you find it, say so and continue. If not, ask: "Do you have the
   source code for this site here?"
3. Diagnose the page (`diagnose` tool, or [diagnose.md](diagnose.md)). Show the outlined captures and the table
   before you change anything.
4. Absorb the brand (`brand_theme` tool, [brand.md](brand.md)): brand color, typeface, logo, and success and failure
   colors fitted to them. Show the notes and confirm the brand color, the typeface and the logo file with the owner.
5. Then one of two routes, both wearing that theme:
   - **Source code is here: Swap.** Replace each marked spot in their code, keep their brand and words, re check
     until clean. Follow [swap.md](swap.md).
   - **Only the address (a hosted builder, lost source, a template they cannot edit): Rebuild.** Read the page's
     content (`extract_content` tool), rebuild the same content from patterns and registry components, check the
     rebuild, and show it next to the original. Follow [rebuild.md](rebuild.md).

## Building a new one

Ask, in one message, for what you do not already know:

1. The product in one sentence.
2. Who the screen is for.
3. What kind of screen: landing, dashboard, app screen, store, editorial, sign in and onboarding, or AI chat.
4. The real content they have: name, words, numbers with a source, images they own.
5. Their brand: a color, a typeface, the logo file, or any existing page to absorb them from ([brand.md](brand.md)).

Then follow [build.md](build.md) and run Diagnose on your result before you show it. Missing content stays a
clearly marked gap; never invent numbers, logos or testimonials.
