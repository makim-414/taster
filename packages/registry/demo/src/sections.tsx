import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  Alert,
  AppShell,
  Avatar, AvatarFallback,
  Badge,
  BracketLabel,
  BarChart,
  Button,
  Calendar,
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Combobox,
  CommandPalette, type CommandItem,
  CompareChart,
  DataGrid,
  DatePicker,
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
  DonutChart,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  Funnel,
  Input, Select,
  Stat,
  AreaChart,
  Popover, PopoverTrigger, PopoverContent,
  Progress,
  Separator,
  ShortcutsCheatsheet,
  Skeleton,
  Sparkline,
  DataTable, type TableColumn,
  Tabs,
  Checkbox, Switch,
  TooltipProvider, Tooltip, TooltipTrigger, TooltipContent,
  TrendChart,
  useHotkeys, useListNavigation,
  WorkflowSection,
  PricingCards, type PricingPlan,
  RevealFaq,
  StepShowcase, type ShowcaseStep,
  GooeyText,
  Marquee,
  NumberTicker,
  TextReveal,
  TextScramble,
  Typewriter,
  Icon, IconLabel,
  GlassLogoReveal,
  MeshDrift, MESH_PALETTES, type MeshPalette,
  DigitSwap,
  LiquidNav,
  GlassFolder,
  SideFolder,
  CoverflowCarousel, type CoverflowItem,
  SelectMenu,
  Citation, Citations, type CitationItem,
  TreeView, useTree, type NodeReader,
  SessionList,
  SensitiveInput,
  OrbitIllustration,
  SpotlightCard,
  AppearancePicker,
  CurvedStreamHero,
  BannerHero,
  WireframeForm,
  LightBeams,
  ThinkingOrb, ORB_RECIPES,
  LampGlow,
  BandShader,
  PasswordField,
  DEFAULT_PASSWORD_RULES,
} from '../../src'
import { AppSections } from './sections-app'
import { ONLY } from './stage'


// A neutral geometric mark for the glass reveal demo. Not a real brand.
const DEMO_MARK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 10h80v22H61v58H39V32H10z"/></svg>'

function DigitSwapDemo() {
  const [shown, setShown] = React.useState(false)
  return (
    <div className="flex flex-col items-start gap-4">
      <div className="text-sm text-text-subtle">Card number</div>
      <DigitSwap
        value={shown ? '4242 4242 4242 0806' : '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 0806'}
        animationKey={shown ? 'shown' : 'masked'}
        direction={shown ? 'up' : 'down'}
        suffixLength={4}
        glyphClassName={shown ? 'text-text' : 'text-text-muted'}
        suffixClassName="text-text"
        className="text-title tabular-nums"
      />
      <Button variant="outline" aria-pressed={shown} onClick={() => setShown((v) => !v)}>{shown ? 'Hide number' : 'Show number'}</Button>
    </div>
  )
}

// Abstract landscapes drawn as SVG, for the heroes and covers that need a picture and no words on it. A title
// drawn into a picture is text a screen reader and a translator cannot reach, so titles stay in the markup.
function scene(i: number): string {
  const skies = [['#8fa3b8', '#d9d4c7'], ['#2b3442', '#7d6f6a'], ['#c9a98c', '#efe2cf'], ['#51606e', '#aeb6b5'], ['#6d7f73', '#d7d3bd']]
  const [top, low] = skies[i % skies.length]
  const ridge = (y: number, amp: number, phase: number) => {
    const points = Array.from({ length: 13 }, (_, k) => `${k * 100},${Math.round(y + Math.sin(k * 1.3 + phase + i) * amp + Math.sin(k * 0.47 + i * 2) * amp * 0.6)}`)
    return `M0,750 L${points.join(' L')} L1200,750 Z`
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${low}"/></linearGradient></defs><rect width="1200" height="750" fill="url(#s)"/><path d="${ridge(400, 50, 0)}" fill="#000" fill-opacity=".18"/><path d="${ridge(500, 60, 2)}" fill="#000" fill-opacity=".28"/><path d="${ridge(610, 45, 4)}" fill="#000" fill-opacity=".42"/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
const SCENES = [0, 1, 2, 3, 4].map(scene)

const COVERS: CoverflowItem[] = ['Field notes', 'Ten rules', 'Before and after', 'Two widths', 'The swap'].map((t, i) => ({
  id: `c${i}`,
  title: t,
  subtitle: `Issue ${String(i + 1).padStart(2, '0')}, 2026`,
  image: scene(i),
  description: 'A sample cover drawn for the demo.',
}))

const CITES: CitationItem[] = [
  { id: 'apg', title: 'ARIA Authoring Practices: tree view', domain: 'w3.org', url: 'https://www.w3.org/WAI/ARIA/apg/patterns/treeview/' },
  { id: 'wcag', title: 'Understanding SC 2.5.8 Target Size', domain: 'w3.org', url: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html' },
  { id: 'mdn', title: 'prefers-reduced-motion', domain: 'developer.mozilla.org', url: 'https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion' },
]

interface Unit { id: string; name: string; children?: Unit[] }
const UNITS: Unit[] = [
  { id: 'commercial', name: 'Commercial', children: [{ id: 'cc-1100', name: 'Sales, CC-1100' }, { id: 'cc-1200', name: 'Marketing, CC-1200' }] },
  { id: 'product', name: 'Product', children: [{ id: 'cc-2100', name: 'Engineering, CC-2100' }, { id: 'cc-2200', name: 'Design, CC-2200' }] },
  { id: 'cc-3100', name: 'Customer service, CC-3100' },
]
const UNIT_READER: NodeReader<Unit> = { key: (u) => u.id, children: (u) => u.children, label: (u) => u.name }

function TreeDemo() {
  const tree = useTree(UNITS, { reader: UNIT_READER, defaultExpanded: ['commercial'], defaultActive: 'cc-1200', defaultChecked: ['cc-1100'] })
  return (
    <div className="max-w-sm rounded-lg border border-border p-1">
      <TreeView tree={tree} label="Cost centres" checkable>{(e) => e.node.name}</TreeView>
    </div>
  )
}

function SelectMenuDemo() {
  const [lang, setLang] = React.useState('en')
  return (
    <div className="max-w-xs">
      <SelectMenu
        aria-label="Language"
        value={lang}
        onValueChange={setLang}
        items={[
          { value: 'en', label: 'English', hint: 'en' },
          { value: 'ko', label: '한국어', hint: 'ko' },
          { value: 'ja', label: '日本語', hint: 'ja' },
          { value: 'de', label: 'Deutsch', hint: 'de', disabled: true },
        ]}
      />
    </div>
  )
}
import { ContentSections, ContentFooters } from './sections-content'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  if (ONLY) return ONLY === id ? <section data-registry-id={id} className="min-w-0"><div className="min-w-0">{children}</div></section> : null
  return (
    <section data-registry-id={id} className="mb-12 min-w-0">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-title font-semibold tracking-tight">{title}</h2>
        <code className="text-caption text-text-subtle">{id}</code>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function AccordionDemo() {
  const items = [
    { q: 'Why is the core achromatic?', a: 'The system definition is neutral. A brand color is injected into the accent slot you left open.' },
    { q: 'How is a brand color applied?', a: 'Override the --brand token once and everything built on the accent follows.' },
    { q: 'Where do the components come from?', a: 'They borrow the shadcn/ui and Radix API and are restyled with neutral tokens.' },
  ]
  return (
    <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
      {items.map((it, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger>{it.q}</AccordionTrigger>
          <AccordionContent>{it.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

function AppShellDemo() {
  const nav = [
    { label: 'Overview', href: '#', active: true, group: 'Workspace' },
    { label: 'Reports', href: '#', count: 4, group: 'Workspace' },
    { label: 'Audience', href: '#', group: 'Workspace' },
    { label: 'Settings', href: '#', group: 'Account' },
    { label: 'Billing', href: '#', group: 'Account' },
  ]
  return (
    <div className="relative h-[460px] overflow-auto border border-border">
      <AppShell
        brand={<span className="text-sm font-semibold">Acme</span>}
        nav={nav}
        title="Overview"
        subtitle="Last 30 days"
        rightSlot={<Button size="sm" variant="outline">Export</Button>}
        footer={<div className="text-label text-text-muted">Signed in as Jordan</div>}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Active users" value="12,840" delta={{ value: '8.2%', dir: 'up' }} sub="vs last month" />
          <Stat label="Churn" value="3.1%" delta={{ value: '0.6%p', dir: 'down', neutral: true }} sub="vs last week" />
        </div>
      </AppShell>
    </div>
  )
}

function CommandDemo() {
  const [open, setOpen] = React.useState(false)
  const [last, setLast] = React.useState('nothing yet')
  useHotkeys({ 'mod+k': () => setOpen(true) })
  // Running a command closes the palette, and focus goes back to whatever opened it.
  const pick = (label: string) => () => {
    setLast(label)
    setOpen(false)
  }
  const items: CommandItem[] = [
    { id: 'go-reports', kind: 'Go to', label: 'Reports', hint: 'g r', run: pick('Reports') },
    { id: 'go-audience', kind: 'Go to', label: 'Audience', hint: 'g a', run: pick('Audience') },
    { id: 'new-report', kind: 'Action', label: 'Create report', run: pick('Create report') },
    { id: 'export', kind: 'Action', label: 'Export as CSV', run: pick('Export as CSV') },
    { id: 'library', kind: 'Go to', label: '라이브러리', hint: 'g l', run: pick('라이브러리') },
  ]
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={() => setOpen(true)}>Open command palette</Button>
      <span className="text-sm text-text-muted">or press Cmd/Ctrl + K. Last run: {last}</span>
      {open && <CommandPalette items={items} onClose={() => setOpen(false)} />}
    </div>
  )
}

function ShortcutsDemo() {
  const [open, setOpen] = React.useState(false)
  useHotkeys({ '?': () => setOpen(true) }, !open)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={() => setOpen(true)}>Show shortcuts</Button>
      <span className="text-sm text-text-muted">or press ?</span>
      {open && (
        <ShortcutsCheatsheet
          onClose={() => setOpen(false)}
          groups={[
            { title: 'Navigation', rows: [{ keys: ['g', 'r'], label: 'Go to reports' }, { keys: ['j'], label: 'Next row' }, { keys: ['k'], label: 'Previous row' }] },
            { title: 'General', rows: [{ keys: ['Cmd', 'K'], label: 'Command palette' }, { keys: ['?'], label: 'Show this sheet' }] },
          ]}
        />
      )}
    </div>
  )
}

function InputDemo() {
  const id = React.useId()
  return (
    <div className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <label htmlFor={`${id}-search`} className="text-xs font-medium text-text-muted">Search</label>
        <Input id={`${id}-search`} placeholder="Type a query" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${id}-name`} className="text-xs font-medium text-text-muted">Campaign name</label>
        <Input id={`${id}-name`} defaultValue="Summer promotion" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${id}-range`} className="text-xs font-medium text-text-muted">Range</label>
        <Select id={`${id}-range`} defaultValue="30d">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${id}-locked`} className="text-xs font-medium text-text-subtle">Locked field</label>
        <Input id={`${id}-locked`} disabled defaultValue="Read only" />
      </div>
    </div>
  )
}

function PopoverDemo() {
  const id = React.useId()
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline">Size settings</Button></PopoverTrigger>
      <PopoverContent align="start" aria-labelledby={`${id}-title`}>
        <div className="space-y-3">
          <div className="space-y-1">
            <div id={`${id}-title`} className="text-sm font-medium text-text">Dimensions</div>
            <div className="text-caption text-text-subtle">4px grid tokens</div>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor={`${id}-width`} className="w-16 text-label text-text-muted">Width</label>
            <Input id={`${id}-width`} defaultValue="320" className="h-8" />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor={`${id}-height`} className="w-16 text-label text-text-muted">Height</label>
            <Input id={`${id}-height`} defaultValue="180" className="h-8" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function HotkeysDemo() {
  const [last, setLast] = React.useState('none')
  useHotkeys({ 'g q': () => setLast('g then q'), '?': () => setLast('?') })
  const rows = ['Quarterly report', 'Audience export', 'Churn model']
  const [index] = useListNavigation({ length: rows.length })
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        Try the chord <kbd className="rounded border border-border px-1 text-xs">g</kbd> then{' '}
        <kbd className="rounded border border-border px-1 text-xs">q</kbd>, or <kbd className="rounded border border-border px-1 text-xs">?</kbd>.
        Last hotkey: <span className="text-text">{last}</span>
      </p>
      <ul className="max-w-xs rounded-lg border border-border">
        {rows.map((r, i) => (
          <li key={r} className={i === index ? 'bg-bg-elev px-3 py-2 text-sm text-text' : 'px-3 py-2 text-sm text-text-muted'}>
            {r}
          </li>
        ))}
      </ul>
      <p className="text-caption text-text-subtle">Use j / k or the arrow keys to move through the list.</p>
    </div>
  )
}

type Row = { channel: string; sessions: number; conversion: number }
const GRID_DATA: Row[] = [
  { channel: 'Organic search', sessions: 12840, conversion: 3.1 },
  { channel: 'Direct', sessions: 8420, conversion: 2.4 },
  { channel: 'Social', sessions: 6310, conversion: 1.8 },
  { channel: 'Email', sessions: 4120, conversion: 4.2 },
  { channel: 'Referral', sessions: 2980, conversion: 2.0 },
  { channel: 'Paid search', sessions: 2210, conversion: 5.1 },
  { channel: 'Display', sessions: 1340, conversion: 0.9 },
]
const GRID_COLUMNS: ColumnDef<Row, any>[] = [
  { accessorKey: 'channel', header: 'Channel' },
  { accessorKey: 'sessions', header: 'Sessions', cell: (c) => c.getValue().toLocaleString(), meta: { align: 'right' } },
  { accessorKey: 'conversion', header: 'Conversion', cell: (c) => `${c.getValue()}%`, meta: { align: 'right' } },
]

const TABLE_COLUMNS: TableColumn[] = [
  { key: 'channel', label: 'Channel' },
  { key: 'sessions', label: 'Sessions', align: 'right' },
  { key: 'conversions', label: 'Conversions', align: 'right' },
  { key: 'rate', label: 'Rate', align: 'right' },
]
const TABLE_ROWS = [
  { channel: 'Organic', sessions: '8,210', conversions: '312', rate: '3.8%' },
  { channel: 'Direct', sessions: '5,140', conversions: '198', rate: '3.9%' },
  { channel: 'Referral', sessions: '2,030', conversions: '74', rate: '3.6%' },
  { channel: 'Social', sessions: '1,470', conversions: '41', rate: '2.8%' },
]

function TabsDemo() {
  const items = [
    { value: 'overview', label: 'Overview' },
    { value: 'analysis', label: 'Analysis' },
    { value: 'settings', label: 'Settings' },
  ]
  const [value, setValue] = React.useState('overview')
  return (
    <div className="space-y-3">
      <Tabs tabs={items} value={value} onValueChange={setValue} />
      <p className="text-sm text-text-muted">Selected: <span className="text-text">{value}</span></p>
    </div>
  )
}

function TogglesDemo() {
  const [a, setA] = React.useState(true)
  const [b, setB] = React.useState(false)
  const [c, setC] = React.useState(true)
  const [d, setD] = React.useState(false)
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Checkbox label="Accept the terms" checked={a} onChange={(e) => setA(e.target.checked)} />
        <Checkbox label="Subscribe to the newsletter" checked={b} onChange={(e) => setB(e.target.checked)} />
        <Checkbox label="Disabled option" checked disabled />
        <Checkbox dashed label="Connect a domain (empty slot)" />
      </div>
      <div className="flex flex-col gap-3">
        <Switch label="Notifications" checked={c} onChange={(e) => setC(e.target.checked)} />
        <Switch label="Beta features" checked={d} onChange={(e) => setD(e.target.checked)} />
        <Switch label="Disabled switch" checked disabled />
      </div>
    </div>
  )
}

function CalendarDemo() {
  const [selected, setSelected] = React.useState<Date | undefined>(new Date(2026, 5, 16))
  return (
    <div className="inline-block rounded-lg border border-border bg-bg-popover p-3">
      <Calendar mode="single" selected={selected} onSelect={setSelected} />
    </div>
  )
}

const LINE_DATA = [12, 18, 14, 22, 19, 26, 24, 30, 28, 34, 31, 38]
const BAR_DATA = [
  { label: 'Mon', value: 60 }, { label: 'Tue', value: 38 }, { label: 'Wed', value: 82 },
  { label: 'Thu', value: 50 }, { label: 'Fri', value: 70 }, { label: 'Sat', value: 30 },
]
const TREND_DATA = [
  { label: 'Jan', value: 42 }, { label: 'Feb', value: 51 }, { label: 'Mar', value: 48 },
  { label: 'Apr', value: 64 }, { label: 'May', value: 73 }, { label: 'Jun', value: 89 },
]
const COMPARE_DATA = [
  { label: 'Search', value: 92 }, { label: 'Social', value: 64 }, { label: 'Direct', value: 48 },
  { label: 'Email', value: 31 }, { label: 'Ref', value: 22 },
]


const PLANS: PricingPlan[] = [
  { id: 'team', name: 'Team', blurb: 'For a small team that reviews every page before it ships.', price: '$79', period: 'per month', note: '5 seats, billed monthly', features: ['5 sites', 'Daily checks at two widths', 'Alerts when a rule regresses', 'API access'], cta: { label: 'Start a trial', href: '#plans' }, recommended: true },
  { id: 'solo', name: 'Solo', blurb: 'For one person checking their own sites.', price: '$19', period: 'per month', note: '1 seat, billed monthly', features: ['1 site', 'Weekly checks', 'Annotated captures'], cta: { label: 'Start free', href: '#plans' } },
  { id: 'studio', name: 'Studio', blurb: 'For a studio that reviews client work.', price: '$199', period: 'per month', note: '20 seats, billed monthly', features: ['25 sites', 'Checks on every deploy', 'Shared reports', 'Priority support'], cta: { label: 'Talk to us', href: '#plans' } },
]

const FAQ = [
  { q: 'What does the check look at?', a: 'It opens the page in a real browser at two widths and reads the computed styles, so it sees what a visitor sees.' },
  { q: 'Does it change my code?', a: 'No. It reports each spot with the rule it breaks and the pattern that fixes it. You or your agent apply the change.' },
  { q: 'Can I use it on a page that is not public?', a: 'Yes. Point it at a local server or a file on your machine.' },
]

const STEPS: ShowcaseStep[] = [
  { id: 'open', name: 'Open', title: 'Open the page you want to check', body: 'Paste a link or point at your local server. Both widths are captured.', pictures: [{ alt: 'Desktop capture of a landing page', aspect: 1440 / 900 }, { alt: 'Phone capture of the same page', aspect: 390 / 844 }] },
  { id: 'mark', name: 'Mark', title: 'See every spot that reads as generated', body: 'Each one is outlined on the capture and named by its rule.', pictures: [{ alt: 'Phone capture with outlines', aspect: 390 / 844 }, { alt: 'Desktop capture with outlines', aspect: 1440 / 900 }] },
  { id: 'swap', name: 'Swap', title: 'Replace each spot with a pattern', body: 'Every rule points to a pattern and, where one exists, a component to copy.', pictures: [{ alt: 'Pattern page next to the code change', aspect: 1440 / 900 }] },
  { id: 'check', name: 'Check', title: 'Run it again until it is clean', body: 'The change counts only when the rule no longer shows at either width.', pictures: [{ alt: 'Clean report', aspect: 1440 / 900 }] },
]

// Korean labels for the password field's five default rules.
const KO_PASSWORD_RULES: Record<string, string> = {
  length: '8자 이상',
  number: '숫자 1개 이상',
  lowercase: '영문 소문자 1개 이상',
  uppercase: '영문 대문자 1개 이상',
  special: '특수문자 1개 이상',
}

export function Sections() {
  return (
    <>
      <ContentSections />
      <Section id="blocks/accordion" title="Accordion"><AccordionDemo /></Section>

      <Section id="blocks/alert" title="Alert">
        <div className="max-w-md space-y-3">
          <Alert tone="info" title="Sync complete">The latest data is now in every workspace.</Alert>
          <Alert tone="warning" title="Credits running low">Less than 10% of your usage is left. Raise the limit to avoid interruptions.</Alert>
          <Alert tone="danger" title="Deploy failed">The build step errored, so the changes were not applied.</Alert>
        </div>
      </Section>

      <Section id="blocks/app-shell" title="App shell"><AppShellDemo /></Section>

      <Section id="blocks/avatar" title="Avatar">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar size="sm"><AvatarFallback>JD</AvatarFallback></Avatar>
          <Avatar size="md"><AvatarFallback>AB</AvatarFallback></Avatar>
          <Avatar size="lg"><AvatarFallback>QR</AvatarFallback></Avatar>
          <div className="flex -space-x-2">
            {['A', 'B', 'C'].map((c) => (
              <Avatar key={c} size="sm" className="ring-2 ring-bg"><AvatarFallback>{c}</AvatarFallback></Avatar>
            ))}
          </div>
        </div>
      </Section>

      <Section id="blocks/badge" title="Badge">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">Draft</Badge>
          <Badge variant="up">Healthy</Badge>
          <Badge variant="down">Failed</Badge>
          <Badge variant="warn">Pending</Badge>
          <Badge variant="info">In progress</Badge>
          <Badge variant="neutral" withDot={false}>Archived</Badge>
        </div>
      </Section>

      <Section id="blocks/bracket-label" title="Bracket label">
        <ul className="max-w-xl divide-y divide-border rounded-lg border border-border bg-bg-elev">
          {[
            ['northwind.example', 'Press'],
            ['tailspin.example', 'Store'],
            ['contoso.example', 'Own site'],
            ['fabrikam.example', null],
          ].map(([site, kind]) => (
            <li key={site as string} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-4 py-3">
              <span className="text-sm text-text">{site}</span>
              {kind ? <BracketLabel>{kind}</BracketLabel> : <BracketLabel unknown>Unsorted</BracketLabel>}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="blocks/bar" title="Bar chart">
        <div className="max-w-xl rounded-lg border border-border bg-bg-elev p-4">
          <div className="mb-3 text-xs text-text-subtle">Weekly throughput</div>
          <BarChart data={BAR_DATA} label="Weekly throughput" />
        </div>
      </Section>

      <Section id="blocks/button" title="Button">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="solid">Solid</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>
      </Section>

      <Section id="blocks/calendar" title="Calendar"><CalendarDemo /></Section>

      <Section id="blocks/card" title="Card">
        <div className="max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>One supporting line on a neutral surface with a hairline border.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-text-muted">
              A composable card primitive. Header, content and footer slots hold any content.
            </CardContent>
            <CardFooter>
              <Button variant="solid" size="sm">Confirm</Button>
              <Button variant="outline" size="sm">Close</Button>
            </CardFooter>
          </Card>
        </div>
      </Section>

      <Section id="blocks/combobox" title="Combobox">
        <div className="max-w-xs">
          <Combobox
            options={[
              { value: 'next', label: 'Next.js' }, { value: 'vite', label: 'Vite' }, { value: 'remix', label: 'Remix' },
              { value: 'astro', label: 'Astro' }, { value: 'nuxt', label: 'Nuxt' },
            ]}
            placeholder="Pick a framework..."
          />
        </div>
      </Section>

      <Section id="blocks/command-palette" title="Command palette"><CommandDemo /></Section>

      <Section id="blocks/compare" title="Compare chart">
        <div className="max-w-xl"><CompareChart data={COMPARE_DATA} /></div>
      </Section>

      <Section id="blocks/datagrid" title="Data grid">
        <div className="max-w-xl"><DataGrid columns={GRID_COLUMNS} data={GRID_DATA} pageSize={5} /></div>
      </Section>

      <Section id="blocks/datepicker" title="Date picker">
        <div className="max-w-xs"><DatePicker placeholder="Pick a release date" /></div>
      </Section>

      <Section id="blocks/dialog" title="Dialog">
        <Dialog>
          <DialogTrigger asChild><Button variant="secondary">Submit for review</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit for review</DialogTitle>
              <DialogDescription>The selected component goes to the review queue and is listed after approval.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <DialogClose asChild><Button variant="solid">Submit</Button></DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section id="blocks/donut" title="Donut chart">
        <div className="flex flex-wrap items-start gap-12">
          <DonutChart segments={[{ label: 'Direct', value: 4200 }, { label: 'Organic', value: 2800 }, { label: 'Referral', value: 1600 }, { label: 'Other', value: 900 }]} />
          <DonutChart size={160} segments={[{ label: 'Active', value: 312 }, { label: 'Trial', value: 148 }, { label: 'Paused', value: 64 }, { label: 'Churned', value: 41 }]} />
        </div>
      </Section>

      <Section id="blocks/dropdown" title="Dropdown menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline">Open menu</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            <DropdownMenuItem>New component</DropdownMenuItem>
            <DropdownMenuItem>Import</DropdownMenuItem>
            <DropdownMenuItem>Export</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Archive (coming soon)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      <Section id="blocks/funnel" title="Funnel">
        <div className="max-w-md rounded-lg border border-border bg-bg-elev p-4">
          <Funnel stages={[{ label: 'Discovered', value: 4820 }, { label: 'Contacted', value: 2990 }, { label: 'Reviewed', value: 1340 }, { label: 'Converted', value: 612 }]} />
        </div>
      </Section>

      <Section id="blocks/input" title="Input and select"><InputDemo /></Section>

      <Section id="blocks/kpi" title="Stat / KPI">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Monthly active users" value="12,840" delta={{ value: '8.2%', dir: 'up' }} sub="vs last month" />
          <Stat label="Churn rate" value="3.1%" delta={{ value: '0.6%p', dir: 'down', neutral: true }} sub="vs last week" />
          <Stat label="Median response time" value="248ms" sub="last 24 hours" />
        </div>
      </Section>

      <Section id="blocks/line" title="Area / line chart">
        <div className="max-w-xl"><AreaChart data={LINE_DATA} height={140} /></div>
      </Section>

      <Section id="blocks/popover" title="Popover"><PopoverDemo /></Section>

      <Section id="blocks/progress" title="Progress">
        <div className="max-w-sm space-y-5">
          <Progress value={28} aria-label="Indexing" />
          <Progress value={64} aria-label="Rendering" />
          <Progress value={92} aria-label="Publishing" />
          <Progress value={72} label="Upload" />
        </div>
      </Section>

      <Section id="blocks/separator" title="Separator">
        <div className="max-w-sm">
          <div className="space-y-1">
            <div className="text-title font-semibold tracking-[-0.01em]">Registry</div>
            <div className="text-label text-text-muted">Neutral core components</div>
          </div>
          <Separator className="my-4" />
          <div className="flex h-5 items-center gap-3 text-label text-text-muted">
            <span>Blocks</span><Separator orientation="vertical" />
            <span>Charts</span><Separator orientation="vertical" />
            <span>Overlays</span>
          </div>
        </div>
      </Section>

      <Section id="blocks/shortcuts-cheatsheet" title="Shortcuts cheatsheet"><ShortcutsDemo /></Section>

      <Section id="blocks/skeleton" title="Skeleton">
        <div className="max-w-sm space-y-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-24 w-full" />
        </div>
      </Section>

      <Section id="blocks/spark" title="Sparkline">
        <div className="flex max-w-sm flex-col gap-4">
          {[
            { label: 'Conversion', value: '3.2%', dir: 'up' as const, data: [20, 14, 24, 10, 28, 18, 30, 24, 34] },
            { label: 'Bounce rate', value: '1.8%', dir: 'down' as const, data: [30, 26, 28, 20, 22, 16, 14, 12, 9] },
            { label: 'Sessions', value: '12,840', dir: undefined, data: [18, 22, 19, 24, 21, 26, 23, 28, 25] },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-28">
                <div className="text-[11px] text-text-subtle">{s.label}</div>
                <div className="text-title font-semibold tabular-nums text-text">{s.value}</div>
              </div>
              <Sparkline dir={s.dir} data={s.data} label={`${s.label} trend`} />
            </div>
          ))}
        </div>
      </Section>

      <Section id="blocks/table" title="Data table">
        <div className="max-w-md"><DataTable columns={TABLE_COLUMNS} rows={TABLE_ROWS} /></div>
      </Section>

      <Section id="blocks/tabs" title="Tabs"><TabsDemo /></Section>

      <Section id="blocks/toggle" title="Checkbox and switch"><TogglesDemo /></Section>

      <Section id="blocks/tooltip" title="Tooltip">
        <TooltipProvider delayDuration={150}>
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild><Button variant="secondary">Hover me</Button></TooltipTrigger>
              <TooltipContent>Neutral core, brand color injected per product</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="ghost">Shortcut</Button></TooltipTrigger>
              <TooltipContent side="bottom">Cmd K to search</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </Section>

      <Section id="blocks/trend" title="Trend chart">
        <div className="max-w-xl space-y-5">
          <TrendChart data={TREND_DATA} />
          <div>
            <div className="mb-1.5 text-label text-text-subtle">Line mode (area off, height 140)</div>
            <TrendChart data={TREND_DATA} area={false} height={140} />
          </div>
        </div>
      </Section>

      <Section id="blocks/use-hotkeys" title="Keyboard hooks"><HotkeysDemo /></Section>

      <Section id="marketing/pricing-cards" title="Pricing cards">
        <PricingCards plans={PLANS} />
      </Section>

      <Section id="marketing/reveal-faq" title="Reveal FAQ">
        <RevealFaq title="Questions" sub="What people ask before they run the first check." help={<>Something else? <a href="#faq" className="font-medium text-text underline">Write to us</a>.</>} items={FAQ} />
      </Section>

      <Section id="marketing/step-showcase" title="Step showcase">
        <StepShowcase steps={STEPS} label="How it works" />
      </Section>

      <Section id="icons/icon" title="Icon and icon label">
        <div className="max-w-xl space-y-5">
          <div>
            <div className="mb-1.5 text-label text-text-subtle">Control slot: icon-only buttons carry the name</div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="lg" className="px-3" aria-label="Search"><Icon name="search" /></Button>
              <Button variant="ghost" size="lg" className="px-3" aria-label="Open menu"><Icon name="menu" /></Button>
              <Button variant="ghost" size="lg" className="px-3" aria-label="Download report"><Icon name="download" /></Button>
              <Button variant="ghost" size="lg" className="px-3" aria-label="Close"><Icon name="close" /></Button>
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-label text-text-subtle">Sizes from the tokens: sm, md, lg</div>
            <div className="flex items-end gap-4 text-text-muted">
              <Icon name="file" size="sm" />
              <Icon name="file" size="md" />
              <Icon name="file" size="lg" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-label text-text-subtle">Icon label: the icon stays on the first line when the label wraps</div>
            <p className="max-w-[260px] text-body text-text">
              <IconLabel icon="file">Quarterly revenue export, CSV with one row per invoice and the tax column split out</IconLabel>
            </p>
            <p className="mt-2 text-body">
              <IconLabel icon="arrow-up-right" trailing>Read the setup guide</IconLabel>
            </p>
          </div>
        </div>
      </Section>

      <Section id="marketing/workflow-section" title="Workflow section">
        <div className="overflow-x-auto border border-border">
          <div className="min-w-[960px]"><WorkflowSection /></div>
        </div>
      </Section>
      <Section id="motion/gooey-text" title="Gooey text">
        <GooeyText texts={['Measure', 'Mark', 'Swap', 'Check']} textClassName="text-display font-semibold" />
      </Section>

      <Section id="motion/marquee" title="Marquee">
        <Marquee className="border-y border-border py-4">
          {['Two widths', 'Computed styles', 'Exact counts', 'Annotated captures', 'Fix patterns', 'Copyable components'].map((n) => (
            <span key={n} className="text-title font-medium text-text-muted">{n}</span>
          ))}
        </Marquee>
      </Section>

      <Section id="motion/number-ticker" title="Number ticker">
        <div>
          <div className="text-sm text-text-subtle">Pages checked in the sample run</div>
          <NumberTicker value={18420} className="text-h1 font-semibold text-text" />
        </div>
      </Section>

      <Section id="motion/text-reveal" title="Text reveal">
        <TextReveal as="h3" text="Every finding comes with the rule it breaks and the pattern that fixes it." className="max-w-xl text-h2 font-semibold text-text" />
      </Section>

      <Section id="motion/text-scramble" title="Text scramble">
        {/* The text sits in a link, so a keyboard user replays it by tabbing to the link. */}
        <a href="#text-scramble" className="inline-block rounded-sm text-text no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <TextScramble text="Hover or focus to replay" className="text-h2 font-semibold" />
        </a>
      </Section>

      <Section id="motion/typewriter" title="Typewriter">
        <p className="text-h2 font-semibold text-text">Check your <Typewriter words={['landing page', 'dashboard', 'store']} /></p>
      </Section>

      <Section id="motion/glass-logo-reveal" title="Glass logo reveal">
        <GlassLogoReveal logo={DEMO_MARK} label="Sample mark" className="h-[360px] w-full rounded-lg border border-border" />
      </Section>

      <Section id="motion/mesh-drift" title="Mesh drift, palette variations">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(MESH_PALETTES) as MeshPalette[]).map((name) => (
            <div key={name} className="relative h-40 overflow-hidden rounded-lg border border-border">
              <MeshDrift palette={name} className="absolute inset-0" />
              <span className="absolute bottom-2 left-2 rounded-sm bg-bg px-1.5 py-0.5 text-caption text-text">{name}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="motion/digit-swap" title="Digit swap"><DigitSwapDemo /></Section>

      <Section id="blocks/liquid-nav" title="Liquid nav">
        <div className="flex justify-center py-6"><LiquidNav /></div>
      </Section>

      <Section id="blocks/glass-folder" title="Glass folder">
        <div className="flex flex-wrap items-end justify-center gap-10 py-4">
          <GlassFolder label="Exports" art="glacier" seed={3} />
          <GlassFolder
            label="Archive"
            tone="dark"
            art="none"
            action="more"
            labelPlacement="top-left"
            files={[{ name: 'Lookbook 2026', meta: '38 images', art: 'dusk' }, { name: 'Invoices', meta: '12 PDFs' }, { name: 'Contract.pdf', meta: 'PDF, 320 KB' }]}
            menu={[{ label: 'Rename' }, { label: 'Share' }, { label: 'Move to trash', danger: true }]}
          />
        </div>
      </Section>

      <Section id="blocks/side-folder" title="Side folder">
        <article className="max-w-xs">
          <SideFolder />
          <h3 className="mt-3 text-title font-semibold text-text">Every export in one place</h3>
          <p className="mt-1 text-sm text-text-muted">Reports, captures and fix lists land in the same folder.</p>
        </article>
      </Section>

      <Section id="blocks/coverflow-carousel" title="Coverflow carousel">
        <CoverflowCarousel items={COVERS} layout="poster" initialIndex={2} label="Sample covers" />
      </Section>

      <Section id="blocks/select-menu" title="Select menu"><SelectMenuDemo /></Section>

      <Section id="blocks/citations" title="Citations">
        <div className="max-w-lg space-y-3">
          <p className="text-sm leading-6 text-text">
            Controls are 44px on touch screens <Citation citationId="wcag" index={2} idPrefix="demo-src" /> and the tree follows the
            authoring practices <Citation citationId="apg" index={1} idPrefix="demo-src" />.
          </p>
          <Citations citations={CITES} idPrefix="demo-src" />
        </div>
      </Section>

      <Section id="blocks/tree-view" title="Tree view"><TreeDemo /></Section>

      <Section id="motion/thinking-orb" title="Thinking orb, recipes">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ORB_RECIPES.slice(0, 8).map((r) => (
            <div key={r.id} className="flex flex-col items-start gap-2">
              <ThinkingOrb recipe={r} size={64} />
              <span className="text-sm text-text-muted">{r.name}</span>
            </div>
          ))}
        </div>
      </Section>


      <Section id="blocks/spotlight-card" title="Spotlight card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['Diagnose', 'Open any page at two widths and list every finding by rule.'],
            ['Swap', 'Each finding names the pattern and component that replace it.'],
            ['Build', 'Start a new screen from patterns that do not read as generated.'],
          ].map(([title, body]) => (
            <SpotlightCard key={title} href="#blocks/spotlight-card" className="p-5">
              <h3 className="text-title font-semibold text-text">{title}</h3>
              <p className="mt-1 text-sm text-text-muted">{body}</p>
            </SpotlightCard>
          ))}
        </div>
      </Section>


      <Section id="blocks/appearance-picker" title="Appearance picker">
        <div className="max-w-xl">
          <AppearancePicker storageKey="taster-demo-theme" />
        </div>
      </Section>


      <Section id="blocks/curved-stream-hero" title="Curved stream hero">
        <CurvedStreamHero
          title="Every frame, brought into focus."
          description="One row of your own work, flat in the middle and bending toward the viewer at the edges."
          images={SCENES.map((src) => ({ src, alt: '' }))}
        />
      </Section>


      <Section id="blocks/banner-hero" title="Banner hero">
        <BannerHero
          fullHeight={false}
          style={{ minHeight: 520 }}
          image={{ src: SCENES[1], alt: '' }}
          notice="New: the spring catalog is open"
          title="A full picture, and one clear sentence."
          description="The photograph carries the page. The scrim comes from the surface token, so the words stay readable."
          actions={<><Button>Start now</Button><Button variant="ghost">See the work</Button></>}
        />
      </Section>


      <Section id="motion/wireframe-form" title="Wireframe form">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([['Built in', { form: 'star' as const }], ['From a name', { form: 'generated' as const, seed: 'Taster' }], ['From a mark', { mark: 'M10 10h80v22H61v58H39V32H10z' }]] as const).map(([label, props]) => (
            <div key={label} className="relative h-56 overflow-hidden rounded-card border border-border bg-bg">
              <WireframeForm {...props} scale={0.7} />
              <span className="absolute bottom-3 left-3 text-sm text-text-muted">{label}</span>
            </div>
          ))}
        </div>
      </Section>


      <Section id="motion/light-beams" title="Light beams">
        <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-card border border-border bg-bg">
          <LightBeams />
          <p className="relative text-title font-semibold text-text">Background only. The words are yours.</p>
        </div>
      </Section>

      <Section id="motion/lamp-glow" title="Lamp glow">
        <LampGlow className="rounded-card border border-border">
          <h3 className="max-w-xl text-display font-semibold text-text">Light the one thing that matters</h3>
          <p className="mt-3 max-w-md text-body text-text-muted">One source and the words in its light. The color reads the brand token and follows the theme.</p>
        </LampGlow>
      </Section>


      <Section id="motion/band-shader" title="Band shader">
        <div className="flex flex-col gap-3">
          <div className="relative flex h-[28rem] items-center justify-center overflow-hidden rounded-card border border-border bg-bg px-6">
            <BandShader />
            <div className="relative max-w-2xl text-center">
              <h3 className="text-balance text-h1 font-semibold leading-tight text-text sm:text-display">Light that keeps its edges</h3>
              <p className="mt-3 text-body text-text-muted">Background only. The words are yours.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="relative h-40 overflow-hidden rounded-card border border-border bg-bg">
              <BandShader split={0} bands={5} scrim={0} />
              <span className="absolute bottom-2 left-2 rounded-sm bg-bg px-1.5 py-0.5 text-caption text-text">split 0, one clean color</span>
            </div>
            <div className="relative h-40 overflow-hidden rounded-card border border-border bg-bg">
              <BandShader edges={['var(--chart-2)', 'var(--chart-5)']} angle={-20} ripple={1} scrim={0} />
              <span className="absolute bottom-2 left-2 rounded-sm bg-bg px-1.5 py-0.5 text-caption text-text">edges from two tokens</span>
            </div>
          </div>
        </div>
      </Section>


      <Section id="blocks/session-list" title="Session list">
        <SessionList
          sessions={[
            { id: '1', device: 'Chrome on macOS', location: 'Seoul, KR', lastActive: 'just now', current: true, kind: 'desktop' },
            { id: '2', device: 'Safari on iPhone', location: 'Seoul, KR', lastActive: '2 hours ago', kind: 'mobile' },
            { id: '3', device: 'Firefox on Windows', location: 'Berlin, DE', lastActive: 'yesterday', kind: 'desktop' },
            { id: '4', device: 'Chrome on iPad', location: 'Austin, US', lastActive: '3 days ago', kind: 'tablet' },
          ]}
        />
      </Section>

      <Section id="blocks/sensitive-input" title="Sensitive input">
        <div className="flex max-w-sm flex-col gap-2">
          <label htmlFor="demo-sensitive" className="text-sm font-medium text-text">Sample value</label>
          <SensitiveInput id="demo-sensitive" defaultValue="demo_value_not_a_credential" showCopy />
        </div>
      </Section>

      <Section id="blocks/password-field" title="Password field">
        <div className="grid gap-8 md:grid-cols-3">
          <PasswordField id="demo-password-empty" />
          <PasswordField id="demo-password-filled" label="New password" defaultValue="demo-value" />
          <PasswordField
            id="demo-password-ko"
            lang="ko"
            label="비밀번호"
            defaultValue="Demo-value-26"
            requirementsLabel="비밀번호 조건"
            strengthLabels={{ empty: '비밀번호를 입력하세요', weak: '약한 비밀번호', medium: '보통 비밀번호', strong: '안전한 비밀번호' }}
            metLabel="충족"
            unmetLabel="미충족"
            revealLabel="비밀번호 보기"
            rules={DEFAULT_PASSWORD_RULES.map((r) => ({ ...r, label: KO_PASSWORD_RULES[r.id] ?? r.label }))}
          />
        </div>
      </Section>

      <Section id="blocks/orbit-illustration" title="Orbit illustration">
        <article className="max-w-xs">
          <OrbitIllustration />
          <h3 className="mt-3 text-title font-semibold text-text">Enrich new leads</h3>
          <p className="mt-1 text-sm text-text-muted">Company and contact data land in every record.</p>
        </article>
      </Section>


      <AppSections />
      <ContentFooters />
    </>
  )
}
