---
id: connection-diagram
name: Connection diagram and logo grid
category: feature-section
uses: [explain-features, show-relationships, prove-trust]
surfaces: [landing, dashboard]
replaces: [AC-11, ICO-01, LAY-02]
components: []
inspiration: [https://21st.dev/@efferd/components/integrations-4-2]
status: draft
---

## When to use

Use it when the point of the section is how things connect: the product in the middle and the sources it reads, the tools it works with, the stages data passes through. A diagram of nodes and fine lines beats a feature row because it shows structure, and a quiet grid of single-color logos beats a bullet list of integrations.

Use the diagram for flows with 4 to 9 nodes. Use the logo grid for 12 or more supported tools. If you connect to three things, write a sentence.

## Anatomy

Diagram form:

- Nodes: small rounded rectangles with a line icon (or none) and a one or two word label. 1px border, transparent or `--bg-elev` fill. No filled circle holding an icon, no colored glyph disc.
- Edges: 1px lines in `--border`, straight or with one elbow, with an optional tiny arrowhead. A hub node in the middle may have a stronger border.
- Layout: left to right or center out, on a fixed grid, with the labels set in `--t-sm`.
- Detail on demand: clicking a node opens a short panel beside the diagram with what it does, instead of cramming text into the node.

Logo grid form: a plain grid, 4 to 6 columns, each cell a single-color logo at the same optical height on a hairline-divided background, with a count caption ("40 supported tools") and a link to the full list.

## Do

- Draw it as inline SVG so strokes stay 1px at any size and text stays selectable.
- Label edges only where the direction or content is not obvious ("daily export").
- Give each node a real accessible name and make the detail panel reachable by keyboard.
- Use the same line weight and radius for every node.
- Take logos from each company's brand kit, in one color (`currentColor`), and size them to one optical height.
- Show only integrations that exist. Mark ones in beta in text.

## Don't

- Do not put a green circle with a white check, or a colored disc behind each icon (AC-11).
- Do not decorate every node with the same stock icons: a bolt, a shield, a sparkle (ICO-01). Use an icon only where it identifies a thing.
- Do not turn the connections into three equal cards with an icon, a heading and a blurb (LAY-02).
- Do not animate dots running along every line. One highlighted path on hover is plenty.
- Do not add logos you do not integrate with, or logos of customers in a section about integrations.

## Swap recipe

Slop version: icon discs and a row of three feature cards.

```html
<!-- before: AC-11, ICO-01, LAY-02 -->
<div class="node"><span class="disc" style="background:#22c55e"><svg><!-- check --></svg></span> Connected</div>
<div class="cards three">
  <div class="card"><Zap/><h3>Fast sync</h3></div>
  <div class="card"><Shield/><h3>Secure</h3></div>
  <div class="card"><Sparkles/><h3>Smart</h3></div>
</div>
```

Fixed version: line nodes, hairline edges, details on click.

```tsx
const nodes = [
  { id: 'crm', label: 'CRM', x: 40, y: 40 },
  { id: 'ads', label: 'Ad accounts', x: 40, y: 140 },
  { id: 'hub', label: 'Warehouse', x: 260, y: 90 },
  { id: 'report', label: 'Weekly report', x: 480, y: 90 },
]
const edges: [string, string][] = [['crm', 'hub'], ['ads', 'hub'], ['hub', 'report']]

export function Diagram({ onSelect }: { onSelect: (id: string) => void }) {
  const at = Object.fromEntries(nodes.map((n) => [n.id, n]))
  return (
    <svg viewBox="0 0 640 220" role="group" aria-label="How data flows into the weekly report" className="w-full">
      {edges.map(([a, b]) => (
        <line key={a + b} x1={at[a].x + 120} y1={at[a].y + 18} x2={at[b].x} y2={at[b].y + 18}
          stroke="var(--border)" strokeWidth="1" />
      ))}
      {nodes.map((n) => (
        <g key={n.id} transform={`translate(${n.x} ${n.y})`} tabIndex={0} role="button"
           onClick={() => onSelect(n.id)} onKeyDown={(e) => e.key === 'Enter' && onSelect(n.id)}>
          <rect width="120" height="36" rx="8" fill="var(--bg-elev)" stroke="var(--border)" />
          <text x="60" y="23" textAnchor="middle" fontSize="12" fill="var(--text)">{n.label}</text>
        </g>
      ))}
    </svg>
  )
}
```

For the logo grid: `grid grid-cols-3 md:grid-cols-6 gap-px bg-border`, each cell `bg-bg p-6 grid place-items-center text-text-muted` and a logo SVG using `fill="currentColor"`.

## Tokens

- Lines and node borders: `--border`; active path or hovered node: `--text-subtle`. Node fill `--bg-elev`, radius `--r-md` (8px in SVG `rx`).
- Type: labels `--t-sm` (12px) in `--text`; caption `--t-sm` in `--text-subtle`.
- Space: grid gap `--sp-4`, section padding `--sp-16`.
- Logos: `currentColor` mapped to `--text-muted`, rising to `--text` on hover.
- Motion: highlight transition `--dur-tooltip` (125ms) with `--ease-out`.
