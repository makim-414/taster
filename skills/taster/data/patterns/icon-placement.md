---
id: icon-placement
name: Icon placement map
category: icon
uses: [set-the-visual-foundation, explain-features, navigate-the-app, navigate-the-site]
surfaces: [landing, dashboard, app, commerce, editorial, auth-onboarding, ai-chat]
replaces: [ICO-01, ICO-02, ICO-03, ICO-04, CMP-03, LAY-02]
components: [icons/icon]
inspiration: []
status: stable
---

## When to use

Use it before any icon goes on a page, and whenever a diagnosis reports an ICO rule. The question is never "which icon fits this card". It is "which slot is this, and does that slot need an icon at all". Generated pages fail here: in our 198 site measurement the same few stock icons on repeat (ICO-01) showed up on 78 of 100 builder made pages and on none of the 88 hand made pages outside the control group. The fix is not to ban icons. It is to put the right kind of mark in the right slot, from one set, and to leave the other slots empty.

The slot list lives in `taxonomy.json` under `iconography.slots`, so tools and agents read the same map. Each slot also lists five worked `variations` (for example an icon-only toolbar, a number instead of an icon, a marked placeholder for a missing logo), rendered side by side in `examples/icon-slots/`:

| Slot | It is | Keep an icon when | Otherwise |
|---|---|---|---|
| Control | buttons, nav, close, menu, search, chevrons | the icon is the control, or a convention people scan for | a text label |
| Explanatory | feature cards, benefit lists, categories, file types | removing it would lose information | nothing, a number, a label, a real screenshot |
| Identity | product logo, partner and platform marks, avatars | always, as the original file | a marked placeholder, initials |
| Data marker | trend arrows, legend swatches, table checks, chart markers | it sits next to the value it encodes, shape plus color | the word or number alone; status as a word, not a colored dot |
| No icon | headings, hero copy, kickers, paragraphs, FAQ, footer | never | type, space and real content |

## Anatomy

- Decide in order: slot, then need, then glyph. Write the slot next to each icon in a comment while building (`{/* icon: control */}`) and delete icons whose slot is "no icon".
- One set for the whole page: one family, one stroke width (1.5 to 2 on a 24 grid), round caps and joins, outline only. A filled glyph appears only as the selected state of its outline twin.
- Three sizes: 16px beside 14 to 16px text, 20px in buttons, nav and 18 to 20px text, 24px for category entries. Data markers may be 12px.
- Text alignment: the icon box is as tall as the first line of its label (`height: 1lh` or the line height token) and centered in it, so a two line label keeps the icon on line one, not floating in the middle.
- Color: `currentColor`; the parent sets `--text`, `--text-muted` or a status token. No tile, disc or tinted square behind the glyph.
- Accessibility: decorative icons get `aria-hidden="true"`. An icon-only control carries `aria-label` on the button and a 44px hit area. Identity marks carry alt text, or empty alt when the name is printed beside them.

## Do

- Run the slot test on every icon in a generated draft. Most explanatory icons fail it and should go.
- Keep the icons that are controls or conventions: search, close, menu, back, more, external link, download, sort.
- Give each explanatory icon that survives a reason specific to its item (this card is about CSV import, so a file glyph), and check no two cards could swap icons without anyone noticing.
- Replace a removed feature icon with something that informs: the number, the unit, the plan it belongs to, or a crop of the real screen.
- Use the original asset for every logo and partner mark, and initials for people without a photo.
- Draw a missing glyph on the same grid and stroke instead of importing a second library.

## Don't

- Do not put one icon on every card or list item because the slot looked empty (ICO-04).
- Do not reach for the builder default glyphs (bolt, shield, sparkles, rocket, check in a circle) as feature decoration (ICO-01).
- Do not mix icon libraries, or outline and filled glyphs, on one page (ICO-02).
- Do not mix stroke weights; a 1.5 stroke next to a 2.5 stroke reads as two sets (ICO-03).
- Do not put the glyph on a pale rounded square (CMP-03) or inside a filled disc (AC-11), and never use emoji as icons (AC-03).
- Do not stand in a generic glyph for a brand, or redraw a logo (AC-18).
- Do not put icons in headings, section kickers or footer columns.
- Do not mark status with a colored dot in front of the label (AC-08); write the status as a word.

## Swap recipe

Slop: a different stock icon on each of three feature cards, one glyph from a second library, mixed weights.

```jsx
{/* before: ICO-01, ICO-02, ICO-03, ICO-04 */}
<div className="grid grid-cols-3 gap-6">
  <div><Zap className="lucide size-6 text-violet-600" /><h3>Fast</h3><p>Ship in minutes.</p></div>
  <div><Shield className="lucide size-6 text-violet-600" /><h3>Secure</h3><p>Bank grade security.</p></div>
  <div><i className="fa-solid fa-chart-line" /><h3>Insights</h3><p>Know what works.</p></div>
</div>
```

Fixed: the explanatory slot fails the test, so the cards lose their icons and gain the fact each one is about. The only icon left is a control, from the one set.

```tsx
import { Icon } from './icons'

{/* after: explanatory icons removed, one control icon kept */}
<dl className="grid gap-6 md:grid-cols-3">
  <div><dt className="text-label text-text-muted">Setup</dt><dd className="text-title">12 minutes median</dd></div>
  <div><dt className="text-label text-text-muted">Access</dt><dd className="text-title">SSO and audit log on every plan</dd></div>
  <div><dt className="text-label text-text-muted">Reports</dt><dd className="text-title">Weekly email, CSV export</dd></div>
</dl>
<a href="/docs" className="inline-flex items-center gap-2 text-body">
  Read the setup guide
  <Icon name="arrow-up-right" size={16} />{/* icon: control, external link */}
</a>
```

```css
.icon-label { display: inline-flex; align-items: flex-start; gap: var(--sp-2); }
.icon-label > svg { flex: none; height: 1lh; width: var(--icon-md); }
```

## Tokens

Sizes `--icon-sm` (16px), `--icon-md` (20px) and `--icon-lg` (24px), stroke `--icon-stroke`. Spacing `--sp-2` between icon and label. Color comes from the parent's text token through `currentColor`; no background token is used behind an icon. The registry `Icon` component (`registry/src/icons/index.tsx`) applies these and the `IconLabel` wrapper handles first line alignment.
