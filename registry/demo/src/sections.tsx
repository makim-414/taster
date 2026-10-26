import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  Alert,
  AppShell,
  Avatar, AvatarFallback,
  Badge,
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
} from '../../src'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
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
          <Stat label="Churn" value="3.1%" delta={{ value: '0.6%', dir: 'down' }} sub="vs last week" />
        </div>
      </AppShell>
    </div>
  )
}

function CommandDemo() {
  const [open, setOpen] = React.useState(false)
  const [last, setLast] = React.useState('nothing yet')
  useHotkeys({ 'mod+k': () => setOpen(true) })
  const items: CommandItem[] = [
    { id: 'go-reports', kind: 'Go to', label: 'Reports', hint: 'g r', run: () => setLast('Reports') },
    { id: 'go-audience', kind: 'Go to', label: 'Audience', hint: 'g a', run: () => setLast('Audience') },
    { id: 'new-report', kind: 'Action', label: 'Create report', run: () => setLast('Create report') },
    { id: 'export', kind: 'Action', label: 'Export as CSV', run: () => setLast('Export as CSV') },
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
  return (
    <div>
      <Button variant="outline" onClick={() => setOpen(true)}>Show shortcuts</Button>
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

export function Sections() {
  return (
    <>
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

      <Section id="blocks/bar" title="Bar chart">
        <div className="max-w-xl rounded-lg border border-border bg-bg-elev p-4">
          <div className="mb-3 text-xs text-text-subtle">Weekly throughput</div>
          <BarChart data={BAR_DATA} />
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

      <Section id="blocks/input" title="Input and select">
        <div className="max-w-sm space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Search</label>
            <Input placeholder="Type a query" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Campaign name</label>
            <Input defaultValue="Summer promotion" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-muted">Range</label>
            <Select defaultValue="30d">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-subtle">Locked field</label>
            <Input disabled defaultValue="Read only" />
          </div>
        </div>
      </Section>

      <Section id="blocks/kpi" title="Stat / KPI">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="Monthly active users" value="12,840" delta={{ value: '8.2%', dir: 'up' }} sub="vs last month" />
          <Stat label="Churn rate" value="3.1%" delta={{ value: '0.6%', dir: 'down' }} sub="vs last week" />
          <Stat label="Median response time" value="248ms" sub="last 24 hours" />
        </div>
      </Section>

      <Section id="blocks/line" title="Area / line chart">
        <div className="max-w-xl"><AreaChart data={LINE_DATA} height={140} /></div>
      </Section>

      <Section id="blocks/popover" title="Popover">
        <Popover>
          <PopoverTrigger asChild><Button variant="outline">Size settings</Button></PopoverTrigger>
          <PopoverContent align="start">
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-text">Dimensions</div>
                <div className="text-caption text-text-subtle">4px grid tokens</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="w-16 text-label text-text-muted">Width</label>
                <Input defaultValue="320" className="h-8" />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-16 text-label text-text-muted">Height</label>
                <Input defaultValue="180" className="h-8" />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </Section>

      <Section id="blocks/progress" title="Progress">
        <div className="max-w-sm space-y-5">
          <Progress value={28} />
          <Progress value={64} />
          <Progress value={92} />
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
              <Sparkline dir={s.dir} data={s.data} />
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
        <TextScramble text="Hover or focus to replay" className="text-h2 font-semibold text-text" />
      </Section>

      <Section id="motion/typewriter" title="Typewriter">
        <p className="text-h2 font-semibold text-text">Check your <Typewriter words={['landing page', 'dashboard', 'store']} /></p>
      </Section>
    </>
  )
}
