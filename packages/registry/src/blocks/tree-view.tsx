import * as React from 'react'
import { cn } from './_cn'

// Tree view: a hierarchy as one keyboard control (WAI-ARIA tree pattern). Arrow keys move and open,
// Home and End jump, typing a few letters finds a row, Enter activates, and with `checkable` Space
// ticks a node and its children, with parents showing a mixed state. What a row says is yours (a
// render function); the row, indent, chevron, tick and screen reader state belong to the tree.
// Written for this registry. The split between useTree (state) and TreeView (rows), the reader
// object and the render-function children follow a 21st.dev tree view the owner picked, whose
// source and license could not be traced, so no code was taken from it.

export type TreeKey = string

export interface NodeReader<N> {
  key: (node: N) => TreeKey
  children?: (node: N) => readonly N[] | undefined
  /** Text used by typeahead. */
  label: (node: N) => string
}

export interface TreeEntry<N> {
  node: N
  key: TreeKey
  level: number
  /** 1-based position among siblings, and the sibling count, for aria-posinset and aria-setsize. */
  position: number
  siblings: number
  branch: boolean
  expanded: boolean
  active: boolean
  checked: boolean
  indeterminate: boolean
}

export interface TreeOptions<N> {
  reader: NodeReader<N>
  defaultExpanded?: TreeKey[]
  defaultActive?: TreeKey
  defaultChecked?: TreeKey[]
  /** Called on Enter or a click on the row. */
  onActivate?: (node: N) => void
  onCheckedChange?: (checked: TreeKey[]) => void
}

export interface Tree<N> {
  entries: TreeEntry<N>[]
  active: TreeKey | null
  setActive: (key: TreeKey) => void
  toggleExpanded: (key: TreeKey) => void
  toggleCheck: (key: TreeKey) => void
  activate: (key: TreeKey) => void
  move: (to: 'up' | 'down' | 'in' | 'out' | 'start' | 'end') => void
  typeahead: (text: string) => void
  checked: TreeKey[]
}

export function useTree<N>(roots: readonly N[], options: TreeOptions<N>): Tree<N> {
  const { reader, onActivate, onCheckedChange } = options
  const [expanded, setExpanded] = React.useState(() => new Set(options.defaultExpanded ?? []))
  const [active, setActiveKey] = React.useState<TreeKey | null>(options.defaultActive ?? null)
  const [checked, setChecked] = React.useState(() => new Set(options.defaultChecked ?? []))

  // Index every node once: parent links and leaf lists drive tri-state checks and "out" moves.
  const index = React.useMemo(() => {
    const byKey = new Map<TreeKey, { node: N; parent: TreeKey | null; kids: TreeKey[] }>()
    const walk = (nodes: readonly N[], parent: TreeKey | null) => {
      for (const n of nodes) {
        const k = reader.key(n)
        const kids = reader.children?.(n) ?? []
        byKey.set(k, { node: n, parent, kids: kids.map(reader.key) })
        walk(kids, k)
      }
    }
    walk(roots, null)
    return byKey
  }, [roots, reader])

  const leaves = React.useCallback(
    (k: TreeKey): TreeKey[] => {
      const kids = index.get(k)?.kids ?? []
      return kids.length ? kids.flatMap(leaves) : [k]
    },
    [index],
  )

  const entries = React.useMemo(() => {
    const out: TreeEntry<N>[] = []
    const walk = (nodes: readonly N[], level: number) => {
      nodes.forEach((n, i) => {
        const k = reader.key(n)
        const kids = reader.children?.(n) ?? []
        const ls = leaves(k)
        const on = ls.filter((l) => checked.has(l)).length
        const open = kids.length > 0 && expanded.has(k)
        out.push({
          node: n,
          key: k,
          level,
          position: i + 1,
          siblings: nodes.length,
          branch: kids.length > 0,
          expanded: open,
          active: k === active,
          checked: on === ls.length,
          indeterminate: on > 0 && on < ls.length,
        })
        if (open) walk(kids, level + 1)
      })
    }
    walk(roots, 0)
    return out
  }, [roots, reader, expanded, active, checked, leaves])

  const toggleExpanded = (k: TreeKey) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const toggleCheck = (k: TreeKey) => {
    const ls = leaves(k)
    const all = ls.every((l) => checked.has(l))
    const next = new Set(checked)
    ls.forEach((l) => (all ? next.delete(l) : next.add(l)))
    setChecked(next)
    onCheckedChange?.([...next])
  }

  const move: Tree<N>['move'] = (to) => {
    const at = entries.findIndex((e) => e.key === active)
    const cur = entries[at]
    if (to === 'start') return entries[0] && setActiveKey(entries[0].key)
    if (to === 'end') return entries.length && setActiveKey(entries[entries.length - 1].key)
    if (!cur) return entries[0] && setActiveKey(entries[0].key)
    if (to === 'down' && entries[at + 1]) setActiveKey(entries[at + 1].key)
    if (to === 'up' && at > 0) setActiveKey(entries[at - 1].key)
    if (to === 'in' && cur.branch) {
      if (!cur.expanded) toggleExpanded(cur.key)
      else if (entries[at + 1]) setActiveKey(entries[at + 1].key)
    }
    if (to === 'out') {
      if (cur.branch && cur.expanded) toggleExpanded(cur.key)
      else {
        const parent = index.get(cur.key)?.parent
        if (parent) setActiveKey(parent)
      }
    }
  }

  const typeahead = (text: string) => {
    const at = entries.findIndex((e) => e.key === active)
    const q = text.toLowerCase()
    const order = [...entries.slice(at + 1), ...entries.slice(0, at + 1)]
    const hit = order.find((e) => reader.label(e.node).toLowerCase().startsWith(q))
    if (hit) setActiveKey(hit.key)
  }

  const activate = (k: TreeKey) => {
    setActiveKey(k)
    const n = index.get(k)?.node
    if (n !== undefined) onActivate?.(n)
  }

  return { entries, active, setActive: setActiveKey, toggleExpanded, toggleCheck, activate, move, typeahead, checked: [...checked] }
}

export interface TreeViewProps<N> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  tree: Tree<N>
  /** Accessible name of the tree. */
  label: string
  checkable?: boolean
  children: (entry: TreeEntry<N>) => React.ReactNode
}

const TYPEAHEAD_PAUSE = 600

export function TreeView<N>({ tree, label, checkable = false, children, className, ...rest }: TreeViewProps<N>) {
  const root = React.useRef<HTMLDivElement>(null)
  const focused = React.useRef(false)
  const buffer = React.useRef('')
  const timer = React.useRef<number | null>(null)

  // Keyboard moves change the active row; focus follows only while the tree has focus.
  React.useEffect(() => {
    if (!focused.current || tree.active === null) return
    root.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(tree.active)}"]`)?.focus()
  }, [tree.active, tree.entries])
  React.useEffect(() => () => void (timer.current !== null && window.clearTimeout(timer.current)), [])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, Parameters<Tree<N>['move']>[0]> = {
      ArrowDown: 'down',
      ArrowUp: 'up',
      ArrowRight: 'in',
      ArrowLeft: 'out',
      Home: 'start',
      End: 'end',
    }
    if (keys[e.key]) tree.move(keys[e.key])
    else if (e.key === 'Enter' && tree.active) tree.activate(tree.active)
    else if (e.key === ' ' && checkable && tree.active) tree.toggleCheck(tree.active)
    else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
      if (timer.current !== null) window.clearTimeout(timer.current)
      buffer.current += e.key
      timer.current = window.setTimeout(() => {
        buffer.current = ''
        timer.current = null
      }, TYPEAHEAD_PAUSE)
      tree.typeahead(buffer.current)
    } else return
    e.preventDefault()
  }

  const tabStop = tree.entries.some((e) => e.key === tree.active) ? tree.active : tree.entries[0]?.key

  return (
    <div
      ref={root}
      role="tree"
      aria-label={label}
      aria-multiselectable={checkable || undefined}
      className={cn('flex flex-col text-sm', className)}
      onKeyDown={onKeyDown}
      onFocus={() => (focused.current = true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focused.current = false
      }}
      {...rest}
    >
      {tree.entries.map((entry) => (
        <div
          key={entry.key}
          role="treeitem"
          data-key={entry.key}
          aria-level={entry.level + 1}
          aria-posinset={entry.position}
          aria-setsize={entry.siblings}
          aria-expanded={entry.branch ? entry.expanded : undefined}
          aria-checked={checkable ? (entry.indeterminate ? 'mixed' : entry.checked) : undefined}
          aria-selected={!checkable ? entry.active : undefined}
          tabIndex={entry.key === tabStop ? 0 : -1}
          onClick={() => tree.activate(entry.key)}
          style={{ paddingLeft: `calc(${entry.level} * var(--sp-4, 16px) + var(--sp-1, 4px))` }}
          className={cn(
            'flex min-h-11 cursor-default select-none items-center gap-1.5 rounded-md pr-2 text-text-muted outline-none desk:min-h-8',
            'hover:bg-bg-elev focus-visible:ring-2 focus-visible:ring-ring',
            entry.active && 'bg-bg-elev text-text',
          )}
        >
          {entry.branch ? (
            <span
              aria-hidden="true"
              className="grid h-5 w-5 flex-none place-items-center text-text-subtle"
              onClick={(e) => {
                e.stopPropagation()
                tree.toggleExpanded(entry.key)
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="var(--icon-stroke, 2)"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={cn('h-3.5 w-3.5 transition-transform duration-150', entry.expanded && 'rotate-90')}
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </span>
          ) : (
            <span aria-hidden="true" className="h-5 w-5 flex-none" />
          )}
          {checkable ? (
            <span
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation()
                tree.setActive(entry.key)
                tree.toggleCheck(entry.key)
              }}
              className={cn(
                'grid h-4 w-4 flex-none place-items-center rounded-sm border transition-colors',
                entry.checked || entry.indeterminate ? 'border-transparent bg-accent text-accent-fg' : 'border-border-input',
              )}
            >
              {entry.checked ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                  <path d="M5 13l4 4 10-10" />
                </svg>
              ) : entry.indeterminate ? (
                <span className="h-0.5 w-2 rounded-full bg-current" />
              ) : null}
            </span>
          ) : null}
          <span className="min-w-0 flex-1 truncate">{children(entry)}</span>
        </div>
      ))}
    </div>
  )
}
