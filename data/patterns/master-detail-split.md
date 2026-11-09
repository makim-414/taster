---
id: master-detail-split
name: Master detail split
category: layout-shell
uses: [browse-records, show-details-on-demand]
surfaces: [app, dashboard]
replaces: [CMP-02, RSP-01]
components: [blocks/master-detail]
inspiration: []
status: draft
---

## When to use

People work through a list one item at a time and need the item's details next to the list: an inbox, invoices, support requests, files, members. On a wide screen both panes show side by side so moving to the next item is one click; on a phone only one pane shows at a time.

If people mostly compare columns across many records, use a table instead. If the detail is a short form opened now and then, a drawer over the list is lighter.

## Anatomy

- Two panes on one surface: the list at 240 to 320px, the detail filling the rest. One hairline (`--border`) between them, no card around each pane.
- List rows: name, one line of description, trailing meta such as status or date. The open row gets one surface step (`--bg-elev`) and `aria-current`.
- Detail pane: the item's heading first, then its attributes as a description list or its content. With nothing selected it shows one quiet sentence, such as "Pick an invoice to see its details."
- Below the md breakpoint: the list fills the screen; choosing a row replaces it with the detail and a Back button at the top. Focus moves to the detail heading so keyboard and screen reader users land on the new content.
- Registry `MasterDetail` takes `list`, `detail`, `detailTitle`, `onBack` and `emptyDetail`. `ItemList` and `DescriptionList` fit the two panes.

## Do

- Keep the selection in the URL (`/invoices/1043`) so the open item survives a reload and can be shared.
- Let each pane scroll on its own on wide screens, so the list keeps its place while the detail is long.
- Keep the Back button in the same place on every detail view and name it in words.
- Open the first item only when that is what people want most of the time; otherwise show the empty detail.

## Don't

- Don't put the list and the detail in two separate bordered cards with a gap between them (CMP-02 when nested in a page card).
- Don't squeeze both panes onto a phone screen, so the list shows three letters per name and the page scrolls sideways (RSP-01).
- Don't open the detail in a modal on wide screens when there is room beside the list.
- Don't move focus on wide screens when a row is chosen; the person is still working in the list.

## Swap recipe

Slop version (fixes CMP-02, RSP-01):

```tsx
<div className="grid grid-cols-[320px_1fr] gap-6">
  <div className="rounded-2xl border bg-white shadow-lg p-4">{rows}</div>
  <div className="rounded-2xl border bg-white shadow-lg p-6">{detail}</div>
</div>
```

Fixed version:

```tsx
import { MasterDetail } from './blocks/master-detail'
import { ItemList } from './blocks/item-list'
import { DescriptionList } from './blocks/description-list'

<MasterDetail
  listLabel="Invoices"
  list={<ItemList items={invoices.map((i) => ({ id: i.id, name: i.title, meta: i.status, selected: i.id === open, onSelect: () => setOpen(i.id) }))} />}
  detail={current ? <DescriptionList items={fieldsOf(current)} /> : null}
  detailTitle={current?.title}
  onBack={() => setOpen(null)}
  emptyDetail="Pick an invoice to see its details."
/>
```

## Tokens

- Surface: one `--bg` for both panes, `--border` for the divider, `--bg-elev` for the open row.
- Ink: `--text` for names and the heading, `--text-muted` for descriptions, `--text-subtle` for meta.
- Space: list rows `--sp-3` vertical, detail padding `--sp-5`.
- Breakpoint: md (768px) is where the two panes appear side by side.
- Motion: none for the pane swap; row hover at `--dur-press`.
