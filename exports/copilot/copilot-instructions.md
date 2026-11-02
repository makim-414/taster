<!-- taster:start -->
# Taster: UI rules against the generated look

When you build or change a user interface, avoid every pattern below. They are the 74 rules of
Taster (https://github.com/makim-414/taster), each one a habit that makes a screen read as AI generated. Each line says what to avoid and
what to do instead. Use the project's design tokens for color, spacing, radius and type, never raw values.

## High severity

- AC-01 All-caps label with wide letter spacing. Avoid: Small labels above headings, scroll hints and section heads set in capitals with the letters pushed apart. Instead: Sentence case and default letter spacing. Carry emphasis with weight, size or color.
- AC-02 Em dash or en dash in interface text. Avoid: Long dashes between clauses, or labels shaped like 'WORD, dash, explanation'. Instead: Use a comma, a colon, a middle dot, or split the sentence. For ranges use 'to' or a tilde.
- AC-03 Emoji as icons or bullets. Avoid: Emoji and pictographs used for feature icons, headings, bullets and labels. Instead: Say it in words. If an icon is needed, use one line-icon set throughout.
- AC-04 Tinted pill badge. Avoid: A short label in a fully rounded capsule with a pale colored fill and text in the same hue. Instead: Plain text in the body color, or a neutral outline. If state matters, put it in words next to the value.
- AC-10 Thick colored accent bar on one edge of a card. Avoid: A card or callout with a heavy colored stripe down its left side. Instead: Remove the stripe. Separate with spacing, a heading, or one neutral hairline.
- AC-15 Browser or system default font left as is. Avoid: Headings and body rendered in whatever the browser or the operating system picks. Instead: Choose a text face on purpose, load it, and give it a real fallback stack.
- COL-01 Purple gradient. Avoid: Indigo to violet gradients on hero backgrounds, buttons and headings. Instead: Pick one brand color and use it flat. If a gradient is needed, keep it within one hue and low contrast.
- COL-02 Cream background with a terracotta accent. Avoid: A paper-colored cream or beige page with a rusty orange accent, paired with a large serif. Instead: Pure white or a neutral that comes from the brand, and an accent taken from the brand definition.
- COL-03 Near-black background with a neon glow. Avoid: A near-black page with one neon green or vermilion color made to glow. Instead: If a dark theme is needed, separate surfaces with gray steps and keep the accent flat.
- COL-04 Gradient-filled text. Avoid: Headline words filled with a gradient instead of a color. Instead: Solid text color. Create emphasis with size, weight or placement.
- TYP-03 One italic serif word in the headline. Avoid: One word inside a sans-serif headline switched to an italic serif or a different color. Instead: One typeface for the heading. If emphasis is needed, rewrite the sentence.
- LAY-01 The centered hero formula. Avoid: Centered headline, a pill badge above it, two buttons below. Instead: An asymmetric layout that fits the content, with the real product screen or a photo in front.
- LAY-02 Three icon cards in a row. Avoid: Three equal cards, each with an icon, a title and a two-line description. Instead: A list, a table or a real screenshot, whichever fits the content.
- LAY-03 01 / 02 / 03 section numbers. Avoid: Small zero-padded numbers stamped above each section or step. Instead: Remove them unless order truly matters. If it does, number with words in the heading.
- CMP-01 Announcement pill above the headline. Avoid: A rounded 'New: something' chip sitting right above the hero headline. Instead: Remove it. If there is real news, say it in a sentence under the headline.
- CMP-03 Rounded square icon tile. Avoid: A pale colored rounded square above a heading with a same-colored icon inside. Instead: Leave the icon on its own, or remove it.
- CMP-07 Fake terminal hero. Avoid: A window with red, yellow and green dots holding monospace commands. Instead: The real product screen.
- CMP-08 Fake trust signals. Avoid: Testimonials from people who do not exist, logo strips of invented companies. Instead: Real customers only. If there are none, remove the section.
- BG-01 Aurora or mesh blob background. Avoid: Large blurred color blobs or radial glows floating behind the hero. Instead: Show the product, a real photo, or nothing. A flat background is a valid choice.
- KO-01 Korean words broken mid-word. Avoid: Korean lines that wrap in the middle of a word because word-break was left at the default. Instead: word-break: keep-all on Korean text, with overflow-wrap: anywhere as a safety net for long strings.
- KO-02 Only a Latin font declared for Korean text. Avoid: The font stack lists only Latin faces, so Hangul falls back to the operating system font. Instead: Declare a Korean face on purpose, in the intended order with the Latin face.
- KO-03 Tight line height on Korean text. Avoid: Korean paragraphs set with the line height tuned for Latin text. Instead: 1.6 to 1.8 for Korean body text.
- KO-08 Missing or wrong lang attribute on a Korean page. Avoid: A page written in Korean that declares lang="en" or no language at all. Instead: <html lang="ko">, and lang="en" on English passages inside.
- RSP-01 Page wider than the screen. Avoid: The page scrolls sideways because an element sticks out past the right edge of the viewport. Instead: Let the element shrink (min-width: 0 on flex and grid children, max-width: 100% on media), wrap long strings, and put wide tables or code in their own scroll box.
- RSP-02 Text cut off by its box. Avoid: A short label or name cut by overflow or an ellipsis, or a label that spills past the edge of its button. Instead: Give the label room (wrap it, let the box grow, or move secondary text below). Truncate only long titles, keep at least the first words visible, and show the full text on hover or focus.
- RSP-03 Letters stacked one per line. Avoid: A column so narrow that a word wraps letter by letter down the screen. Instead: Set a minimum width on the column, drop to one column earlier, or move the label above the value instead of beside it.
- COL-08 Text that does not stand out from its background. Avoid: Text whose contrast against the surface behind it is under 4.5:1, or under 3:1 for large text. Instead: Raise the text token, not each instance: check the smallest text color against the surface closest to it in lightness, for example a muted card, in both themes.
- CPY-02 Empty value traces on screen. Avoid: Words like undefined, NaN, null, [object Object] or Invalid Date, or two separators with nothing between them, shown to the reader. Instead: Render a missing value as a middle dot or a short sentence ("Not measured yet"), never as the raw value or a fake zero, and drop the separator when a field is empty.

## Medium severity

- AC-05 Colored outline pill badge. Avoid: The same capsule label, now with a transparent fill and a saturated colored border. Instead: Plain text, or a neutral hairline border with square or slightly rounded corners.
- AC-06 Tinted notice band. Avoid: A full-width notice or warning box laid on a pale yellow or blue fill. Instead: A neutral surface with a 1px neutral border.
- AC-07 Orange 'processing' pill with a glow. Avoid: A progress state shown as an orange pill with a soft glow around it. Instead: Neutral text with a neutral spinner.
- AC-08 Colored status dot. Avoid: A small colored circle placed in front of a label to mean 'live', 'active' or 'online'. Instead: Say the state in words. If a mark is needed, use the text color, or the brand's own success or failure token for a real outcome, flat and still.
- AC-09 Monospace font for interface labels. Avoid: Labels, numbers and small headings set in a monospace face outside of code. Instead: Use the text face. For aligned numbers use font-variant-numeric: tabular-nums.
- AC-11 Glyph inside a filled circle. Avoid: A white check inside a green circle, or an icon on a colored or gray disc. Instead: The line icon alone without the disc, or plain neutral text.
- AC-13 Rainbow charts. Avoid: Every chart series in a different saturated color, bars filled red, yellow and green. Instead: Steps of one color, with the brand color only on the series that matters.
- AC-16 Ghost button as the main call to action. Avoid: The first and most important button on the page is only an outline with no fill. Instead: Fill the primary button. Keep the outline style for the secondary action next to it.
- AC-17 Drawn mockup instead of the real thing. Avoid: CSS shapes or a hand-drawn fake screen where a product photo or a real screenshot belongs. Instead: A real screenshot or a real photo.
- AC-18 Logo or wordmark redrawn, font swapped. Avoid: A supplied logo redrawn as similar shapes, or a wordmark retyped in a system font. Instead: Use the original pixels or vectors as they are. Export vectors as outlines from the design tool.
- AC-19 Generated photo look. Avoid: Golden hour light, glossy skin, bright and saturated generated photos. Instead: Give real reference photos as input; add film grain, lower saturation, slightly darker exposure.
- COL-06 Rainbow of tinted boxes. Avoid: Every card, badge and icon background gets a different pale tint until the page is a rainbow. Instead: Neutral surfaces, with color only where it means something (error, success).
- COL-07 Large colored glow shadow. Avoid: Wide, soft shadows tinted with the accent color around buttons and cards. Instead: No shadow, or a small neutral shadow that only describes elevation.
- TYP-01 Inter everywhere. Avoid: Every heading and every paragraph set in Inter. Instead: Keep Inter for interface text if you like it, and pair it with a face that has a point of view for headings.
- TYP-02 The usual substitute fonts. Avoid: Told to avoid Inter, generated pages move to Space Grotesk, Instrument Serif, Geist and the like. Instead: A face chosen for the brand context, with a one-line reason you can state.
- TYP-04 Whole sentence as a giant headline. Avoid: A sentence of more than eight words set at display size. Instead: A short headline, and the explanation at body size underneath.
- TYP-05 Extreme negative letter spacing on large type. Avoid: Big headlines squeezed so tight the letters nearly touch. Instead: Use the tracking the typeface was drawn for, or tighten slightly (around -0.01em to -0.02em) and check by eye.
- LAY-04 The predictable section order. Avoid: Hero, logo strip, three cards, three pricing tiers, testimonials, footer, in that order. Instead: Order the page by what only this product has.
- LAY-05 Bento grid. Avoid: Rounded boxes of different sizes fitted together like a puzzle. Instead: A simple grid sized to the information.
- CMP-02 Card inside a card. Avoid: Bordered or shadowed rounded boxes nested inside other bordered or shadowed rounded boxes. Instead: Keep the outer container, and separate the inner items with spacing or hairlines.
- CMP-04 Same large radius and same soft shadow on everything. Avoid: Every box shares one large radius and one gray shadow. Instead: A radius scale tied to element size, and shadows only on things that float.
- CMP-05 Glass panels everywhere. Avoid: Frosted, blurred translucent panels used for ordinary content blocks. Instead: Opaque surfaces. Keep blur for things that float over moving content.
- CMP-06 Row of three big stats. Avoid: Three big numbers such as '10K+ users, 99.9% uptime, 3x faster'. Instead: Only real numbers, with their source.
- CMP-09 Three pricing tiers with the middle one raised. Avoid: Three price cards where only the middle one gets a colored border, a badge or a scale up. Instead: Three tiers only when there really are three; mark the recommendation in words.
- ICO-02 Icons from more than one set. Avoid: Icons from two libraries on one page, or outline and filled glyphs mixed in the same interface. Instead: Pick one set and redraw the odd glyphs on its grid and stroke. Filled only as the selected state of an outline icon.
- ICO-04 An icon on every card. Avoid: Each card or item in a group of three or more opens with a decorative icon above its heading and description. Instead: Decide the slot first. Feature cards rarely need an icon: remove it, or replace it with a number, a label or a real screenshot.
- CPY-01 Generated copy voice. Avoid: Weightless parallel lines like 'Build faster, ship smarter' and 'not X, but Y' constructions. Instead: One concrete fact only this product can claim.
- KO-04 Uppercase transform on Korean text. Avoid: text-transform: uppercase applied to labels that contain Korean. Instead: Remove the transform. Style Korean labels with weight and size.
- KO-05 Letter spacing that is too wide or too tight on Korean. Avoid: Korean text tracked out like an English label, or squeezed like an English headline. Instead: Default tracking, or a very small negative value on large headings, checked by eye.
- KO-06 Fake italic on Korean. Avoid: Italic applied to Hangul, which the browser slants artificially. Instead: Emphasize with weight or color.
- KO-07 Translated-sounding generated Korean copy. Avoid: Literal translations of English marketing lines that sound foreign in Korean. Instead: Short, concrete sentences written as if Korean came first.
- KO-10 Justified Korean paragraphs. Avoid: Korean body text aligned to both edges. Instead: Left alignment.
- KO-11 Korean body text that is too small. Avoid: Korean captions and body copy set below 13px. Instead: 14px or more for Korean captions and 16px or more for body text.
- RSP-04 Text overlapping text. Avoid: Two pieces of text drawn on top of each other. Instead: Take the element out of absolute positioning or give it its own row at narrow widths; check line-height and negative margins.
- RSP-06 Touch target under 44px. Avoid: On a phone or tablet width, a button, field or control under 44px high (an icon-only one under 44 by 44px), or a plain text link under 24px high. Instead: Make controls 44px on touch screens and shrink them only for a wide screen without a coarse pointer, for example @media (min-width: 1024px) and (not (pointer: coarse)). Do not key the small size on pointer: fine, which a headless browser does not report.

## Low severity

- AC-12 Heavy contact form in the middle of a landing page. Avoid: A large form with name, company, phone and message fields placed mid page or at the end of a landing page. Instead: One button link in the closing section and an email link in the footer.
- AC-14 Flat gray card with a hairline border, everywhere. Avoid: White or gray cards with a 1px gray border and the same radius fill the whole screen. Instead: Group with surface contrast and spacing, and keep borders only where they are needed.
- COL-05 Green as the replacement for banned purple. Avoid: Once purple is avoided, the same layout returns in emerald or mint green. Instead: Change the structure (glow, gradient), not the hue.
- LAY-06 Every gap is the same. Avoid: The space between sections and between cards is one value everywhere. Instead: Close relations get small gaps, distant ones large.
- CMP-10 A subscribe form at the end of every page. Avoid: An email field at the bottom of every page, with a thank-you message even though nothing is sent. Instead: Only a newsletter that is actually run.
- CMP-11 Dark only, no light mode. Avoid: Only a dark screen, ignoring the visitor setting. Instead: Define both modes in tokens.
- ICO-01 The same few stock icons on repeat. Avoid: A handful of default icons (lightning, shield, sparkles) used over and over. Instead: Icons only where they help, chosen within one set for their meaning.
- ICO-03 Stroke weights that do not match. Avoid: Line icons drawn at clearly different stroke weights on one page, such as 1.5 next to 2.5. Instead: One stroke width for the whole set, between 1.5 and 2 on a 24 grid.
- MOT-01 The same entrance animation on every block. Avoid: Every block fades in from below as you scroll, or bounces with an overshooting ease. Instead: Motion only for changes of state.
- KO-09 English button labels on a Korean page. Avoid: The body is Korean but buttons still say 'Get started' or 'Learn more'. Instead: Korean button labels that name the action.
- RSP-05 Part of the page scrolls sideways. Avoid: A box inside the page hides content behind a sideways scroll at this width. Instead: Wrap the content, switch a wide table to stacked rows at narrow widths, or mark an intended scroll row with data-taster-allow="scroll" and show that more content follows.

## Check the result

- With the Taster MCP server connected (local plugin, or hosted at https://taster-six.vercel.app/api/mcp), call `diagnose` on the page and fix every finding.
- Without it, open https://taster-six.vercel.app and paste the page address, or run `node engine/cli.mjs <url or file>` in a Taster clone.
- Rules marked by eye in the report (manual) need a look at the screen; the others are measured in a real browser.
<!-- taster:end -->
