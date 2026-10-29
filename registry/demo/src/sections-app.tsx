import * as React from 'react'
import {
  ActivityFeed, type ActivityEvent,
  Avatar, AvatarFallback,
  Badge,
  Banner,
  Button,
  ButtonGroup, ButtonGroupItem,
  CheckboxGroup,
  ConfirmDialog,
  CopyButton,
  DescriptionList,
  Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerBody, DrawerFooter, DrawerClose,
  EmptyState,
  Field,
  FileDropzone,
  FilterChips,
  Icon,
  Input, Select,
  ItemList,
  Kbd, ShortcutHint,
  LocationMap, type MapPlace,
  MasterDetail,
  Meter,
  NotificationList, type NotificationItem,
  OtpInput,
  PageToc,
  Pagination,
  RadioGroup,
  SearchField,
  SelectableTable, type SelectableColumn,
  SettingsPage, SettingsSection,
  SidebarNav, type SidebarNavGroup,
  Slider,
  SparklineTable,
  Spinner,
  StatStrip,
  StatusList,
  Stepper,
  Switch,
  SwitchList,
  TagInput,
  Textarea,
  ThemeScope,
  ToastProvider, ToastCard, useToast,
  UnderlineTabs,
  Wizard,
} from '../../src'

// Demo sections for the app side components. Same wrapper as sections.tsx: one data-registry-id per entry.
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

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-label text-text-subtle">{children}</div>
}

// Demo-only line icons, drawn on the registry's 24px grid and stroke.
function Glyph({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
  )
}
const G = {
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
  inbox: '<path d="M4 13l2-8h12l2 8"/><path d="M4 13v6h16v-6h-5l-1 2h-4l-1-2z"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3 3 0 0 1 0 6M18 14c1.8.8 3 2.7 3 5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>',
}

// ---------------------------------------------------------------------------------------------- sidebar

function SidebarDemo() {
  const [active, setActive] = React.useState('overview')
  const item = (id: string, label: string, icon: React.ReactNode, count?: number) => ({
    id,
    label,
    icon,
    count,
    active: active === id,
    onSelect: () => setActive(id),
  })
  const groups: SidebarNavGroup[] = [
    {
      id: 'work',
      items: [
        item('overview', 'Overview', <Glyph d={G.home} />),
        item('inbox', 'Inbox', <Glyph d={G.inbox} />, 4),
        item('reports', 'Reports', <Icon name="chart-line" size={18} />),
        item('files', 'Files', <Icon name="file" size={18} />),
      ],
    },
    {
      id: 'admin',
      label: 'Workspace',
      collapsible: true,
      items: [
        item('members', 'Members', <Glyph d={G.people} />),
        item('billing', 'Billing', <Glyph d={G.card} />),
        item('settings', 'Settings', <Glyph d={G.gear} />),
      ],
    },
  ]
  return (
    <div className="flex h-[540px] border border-border sm:h-[440px]">
      <SidebarNav
        groups={groups}
        header={<span className="text-sm font-semibold">Field team</span>}
        headerCollapsed={<span className="text-sm font-semibold" aria-label="Field team">F</span>}
        footer={<span className="text-label text-text-muted">Sam Lee</span>}
      />
      <div className="hidden min-w-0 flex-1 p-5 sm:block">
        <div className="text-title font-semibold capitalize">{active}</div>
        <p className="mt-1 text-sm text-text-muted">Collapse the menu with the button at the bottom; labels move into each item's name.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- map

const PLACES: MapPlace[] = [
  { id: 'riverside', name: 'Riverside branch', detail: '12 Quay Road, open until 20:00', distance: '0.6 km', x: 30, y: 72 },
  { id: 'market', name: 'Market Street branch', detail: '48 Market Street, open until 18:00', distance: '1.1 km', x: 46, y: 36 },
  { id: 'north', name: 'North Park branch', detail: '3 Elm Avenue, open until 19:00', distance: '2.4 km', x: 70, y: 18 },
  { id: 'harbor', name: 'Harbor branch', detail: '90 Dock Lane, closed on Sundays', distance: '3.0 km', x: 82, y: 66 },
  { id: 'oldtown', name: 'Old Town branch', detail: '7 Bell Square, open until 17:30', distance: '3.8 km', x: 14, y: 22 },
]

function MapDemo() {
  const [sel, setSel] = React.useState<string | null>('market')
  return <LocationMap places={PLACES} selectedId={sel} onSelectedChange={setSel} label="Map of branches" listLabel="Branches near you" />
}

// ---------------------------------------------------------------------------------------------- theme scope

function ThemeScopeDemo() {
  const [on, setOn] = React.useState(true)
  const sample = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Save changes</Button>
        <Button size="sm" variant="outline">Cancel</Button>
      </div>
      <Switch checked={on} onChange={(e) => setOn(e.target.checked)} label="Email digests" />
      <div>
        <Badge>Draft</Badge>
      </div>
    </div>
  )
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Caption>theme="light" and radius="2px" on one panel</Caption>
        <ThemeScope theme="light" radius="2px" className="border border-border p-5">
          {sample}
        </ThemeScope>
      </div>
      <div>
        <Caption>brand set to a blue for a customer preview</Caption>
        <ThemeScope brand="oklch(0.52 0.12 250)" brandForeground="oklch(0.99 0 0)" radius="12px" className="border border-border p-5">
          {sample}
        </ThemeScope>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- layout

function SettingsDemo() {
  const [rows, setRows] = React.useState([
    { id: 'digest', label: 'Weekly digest', description: 'A summary of open work every Monday morning.', checked: true },
    { id: 'mentions', label: 'Mentions', description: 'An email when someone mentions you.', checked: true },
    { id: 'product', label: 'Product updates', description: 'At most one email a month.', checked: false },
  ])
  return (
    <SettingsPage title="Workspace settings" description="Changes apply to everyone in this workspace.">
      <SettingsSection
        title="General"
        description="The name people see in invitations and on shared links."
        footer={<Button size="sm">Save</Button>}
      >
        <Field label="Workspace name">
          <Input defaultValue="Field team" />
        </Field>
        <Field label="Time zone" hint="Used for due dates and the weekly digest.">
          <Select defaultValue="cet">
            <option value="utc">UTC</option>
            <option value="cet">Central European Time</option>
            <option value="kst">Korea Standard Time</option>
          </Select>
        </Field>
      </SettingsSection>
      <SettingsSection title="Email" description="What this workspace may send you.">
        <SwitchList rows={rows} onCheckedChange={(id, c) => setRows((r) => r.map((x) => (x.id === id ? { ...x, checked: c } : x)))} />
      </SettingsSection>
    </SettingsPage>
  )
}

const INVOICES = [
  { id: '1042', customer: 'Harbor Supply Co.', amount: '1,240.00', due: '14 March 2026', status: 'Paid' },
  { id: '1043', customer: 'Lindqvist Studio', amount: '380.50', due: '21 March 2026', status: 'Sent' },
  { id: '1044', customer: 'Okafor and Daughters', amount: '2,015.00', due: '28 March 2026', status: 'Draft' },
  { id: '1045', customer: 'Park Lane Dental', amount: '96.00', due: '2 April 2026', status: 'Overdue' },
]

function MasterDetailDemo() {
  const [open, setOpen] = React.useState<string | null>('1043')
  const inv = INVOICES.find((i) => i.id === open)
  return (
    <div className="h-[380px] border border-border">
      <MasterDetail
        className="h-full"
        listLabel="Invoices"
        onBack={() => setOpen(null)}
        detailTitle={inv ? `Invoice ${inv.id}` : undefined}
        emptyDetail="Pick an invoice to see its details."
        list={
          <ItemList
            items={INVOICES.map((i) => ({
              id: i.id,
              name: `Invoice ${i.id}`,
              description: i.customer,
              meta: i.status,
              selected: i.id === open,
              onSelect: () => setOpen(i.id),
            }))}
          />
        }
        detail={
          inv ? (
            <DescriptionList
              items={[
                { term: 'Customer', value: inv.customer },
                { term: 'Amount', value: `EUR ${inv.amount}` },
                { term: 'Due', value: inv.due },
                { term: 'Status', value: inv.status },
                { term: 'Purchase order', value: '' },
              ]}
            />
          ) : null
        }
      />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- tabs, pages

function UnderlineTabsDemo() {
  const [tab, setTab] = React.useState('activity')
  return (
    <UnderlineTabs
      label="Project sections"
      value={tab}
      onValueChange={setTab}
      tabs={[
        { value: 'overview', label: 'Overview' },
        { value: 'activity', label: 'Activity', count: 12 },
        { value: 'settings', label: 'Settings' },
      ]}
      renderPanel={(v) => (
        <p className="max-w-prose text-sm text-text-muted">
          {v === 'overview' && 'Goals, owners and the next milestone for this project.'}
          {v === 'activity' && 'Twelve changes since Monday. Use the arrow keys to move between tabs.'}
          {v === 'settings' && 'Visibility, notifications and who can edit.'}
        </p>
      )}
    />
  )
}

function PaginationDemo() {
  const [page, setPage] = React.useState(4)
  return (
    <div className="flex flex-col gap-2">
      <Pagination page={page} pageCount={12} onPageChange={setPage} />
      <div className="text-label text-text-subtle">Showing rows {(page - 1) * 25 + 1} to {page * 25} of 300</div>
    </div>
  )
}

function TocDemo() {
  const items = [
    { id: 'guide-start', label: 'Before you start' },
    { id: 'guide-import', label: 'Import your data' },
    { id: 'guide-columns', label: 'Match the columns', level: 2 as const },
    { id: 'guide-check', label: 'Check the result' },
  ]
  const body: Record<string, string> = {
    'guide-start': 'Export the list from your old tool as a CSV file with one row per customer and a header row.',
    'guide-import': 'Drop the file on the import page. Files up to 5 MB go through in one step.',
    'guide-columns': 'Each column in the file is matched to a field. Unmatched columns are kept as notes.',
    'guide-check': 'Open five records at random and compare them with the source before you invite the team.',
  }
  return (
    <div className="grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
      <PageToc items={items} className="sm:sticky sm:top-4 sm:self-start" />
      <div className="flex max-w-prose flex-col gap-6">
        {items.map((i) => (
          <div key={i.id}>
            <h3 id={i.id} className="scroll-mt-4 text-title font-semibold text-text">{i.label}</h3>
            <p className="mt-1 text-sm text-text-muted">{body[i.id]}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- buttons

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

function ButtonGroupDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ButtonGroup label="Change week">
        <ButtonGroupItem iconOnly aria-label="Previous week"><Chevron dir="left" /></ButtonGroupItem>
        <ButtonGroupItem>This week</ButtonGroupItem>
        <ButtonGroupItem iconOnly aria-label="Next week"><Chevron dir="right" /></ButtonGroupItem>
      </ButtonGroup>
      <ButtonGroup label="Share report">
        <ButtonGroupItem>Export CSV</ButtonGroupItem>
        <ButtonGroupItem>Copy link</ButtonGroupItem>
        <ButtonGroupItem>Print</ButtonGroupItem>
      </ButtonGroup>
    </div>
  )
}

function CopyDemo() {
  const url = 'https://example.com/r/7f3k2'
  return (
    <div className="flex max-w-lg flex-col gap-1.5">
      <label htmlFor="share-url" className="text-sm font-medium text-text">Share link</label>
      <div className="flex gap-2">
        <Input id="share-url" readOnly value={url} className="min-w-0 flex-1" />
        <CopyButton value={url} label="Copy link" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- forms

function RadioDemo() {
  const [format, setFormat] = React.useState('csv')
  const [speed, setSpeed] = React.useState('standard')
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <RadioGroup
        legend="Export format"
        value={format}
        onValueChange={setFormat}
        options={[
          { value: 'csv', label: 'CSV' },
          { value: 'xlsx', label: 'Excel workbook' },
          { value: 'json', label: 'JSON', description: 'One object per row, for scripts.' },
        ]}
      />
      <RadioGroup
        legend="Delivery"
        variant="cards"
        value={speed}
        onValueChange={setSpeed}
        options={[
          { value: 'standard', label: 'Standard', description: 'Three to five working days.' },
          { value: 'express', label: 'Express', description: 'Next working day if ordered by 14:00.' },
        ]}
      />
    </div>
  )
}

function CheckboxGroupDemo() {
  const [v, setV] = React.useState(['mentions'])
  return (
    <CheckboxGroup
      className="max-w-md"
      legend="Email me about"
      selectAllLabel="All of these"
      value={v}
      onValueChange={setV}
      options={[
        { value: 'comments', label: 'Comments on my tasks' },
        { value: 'mentions', label: 'Mentions' },
        { value: 'summary', label: 'Weekly summary', description: 'Sent on Monday at 08:00.' },
        { value: 'billing', label: 'Billing notices', description: 'Only owners can turn these off.', disabled: true },
      ]}
    />
  )
}

function SliderDemo() {
  const [v, setV] = React.useState(30)
  return (
    <Slider
      className="max-w-md"
      label="Sign out after"
      value={v}
      onValueChange={setV}
      min={5}
      max={120}
      step={5}
      format={(n) => `${n} min`}
      marks={[5, 60, 120]}
      hint="Inactive sessions end after this long."
    />
  )
}

function SwitchListDemo() {
  const [rows, setRows] = React.useState([
    { id: '2fa', label: 'Two-step sign in', description: 'Ask for a code from your phone at every new sign in.', checked: true },
    { id: 'alerts', label: 'Desktop alerts', description: 'Show a system notification for mentions.', checked: false },
    { id: 'sso', label: 'Single sign-on', description: 'Available once a domain is verified.', checked: false, disabled: true },
  ])
  return (
    <SwitchList
      className="max-w-lg"
      heading="Security"
      rows={rows}
      onCheckedChange={(id, c) => setRows((r) => r.map((x) => (x.id === id ? { ...x, checked: c } : x)))}
    />
  )
}

function DropzoneDemo() {
  const sample = React.useMemo(() => [new File(['name,email\n'.repeat(420)], 'customers-march.csv', { type: 'text/csv' })], [])
  return (
    <FileDropzone
      className="max-w-lg"
      label="Customer list"
      hint="CSV or Excel, up to 5 MB"
      accept=".csv,.xlsx"
      maxSize={5 * 1024 * 1024}
      defaultFiles={sample}
    />
  )
}

const PEOPLE = ['Ana Ruiz', 'Ben Okafor', 'Chloe Martin', 'Dev Patel', 'Emma Lindqvist', 'Felix Park']

function SearchDemo() {
  const [q, setQ] = React.useState('')
  const hits = PEOPLE.filter((p) => p.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="flex max-w-md flex-col gap-3">
      <SearchField label="Search members" value={q} onValueChange={setQ} resultCount={hits.length} />
      <ul className="text-sm text-text-muted">
        {hits.length ? hits.map((p) => <li key={p} className="py-1">{p}</li>) : <li className="py-1">No members match "{q}".</li>}
      </ul>
    </div>
  )
}

function ChipsDemo() {
  const [v, setV] = React.useState(['open'])
  return (
    <FilterChips
      label="Filter by status"
      value={v}
      onValueChange={setV}
      options={[
        { value: 'open', label: 'Open', count: 12 },
        { value: 'review', label: 'In review', count: 4 },
        { value: 'closed', label: 'Closed', count: 31 },
      ]}
    />
  )
}

function FieldDemo() {
  const [name, setName] = React.useState('A')
  return (
    <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
      <Field label="Work email" hint="We send the sign in link here.">
        <Input type="email" placeholder="name@company.com" />
      </Field>
      <Field label="Display name" required error={name.trim().length < 2 ? 'Use at least 2 characters.' : undefined}>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Job title" optional>
        <Input />
      </Field>
    </div>
  )
}

function TextareaDemo() {
  return (
    <Field label="Note to the reviewer" className="max-w-lg" hint="Grows with the text, up to 8 lines.">
      <Textarea autoResize minRows={3} maxRows={8} showCount maxLength={280} defaultValue="The totals in March include the refund from the 12th." />
    </Field>
  )
}

function TagDemo() {
  const [tags, setTags] = React.useState(['design', 'billing'])
  return (
    <div className="flex max-w-lg flex-col gap-1.5">
      <div id="tag-label" className="text-sm font-medium text-text">Labels</div>
      <TagInput label="Add a label" aria-describedby="tag-hint" value={tags} onValueChange={setTags} placeholder="Type and press Enter" max={6} />
      <p id="tag-hint" className="text-label text-text-muted">Up to 6. Separate with a comma or Enter.</p>
    </div>
  )
}

function OtpDemo() {
  const [code, setCode] = React.useState('48')
  const [done, setDone] = React.useState(false)
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-text">Verification code</div>
      <OtpInput label="Verification code" value={code} onValueChange={(v) => { setCode(v); setDone(false) }} onComplete={() => setDone(true)} />
      <p className="text-label text-text-muted" aria-live="polite">{done ? 'Code entered. Checking.' : 'We sent a 6 digit code to your phone.'}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- cards, lists

function DescriptionDemo() {
  return (
    <DescriptionList
      className="max-w-2xl"
      items={[
        { term: 'Plan', value: 'Team, billed yearly' },
        { term: 'Owner', value: 'Sam Lee', action: <Button size="sm" variant="ghost">Change</Button> },
        { term: 'Data region', value: 'Europe (Frankfurt)' },
        { term: 'Created', value: '4 March 2026' },
        { term: 'Billing email', value: '' },
      ]}
    />
  )
}

function StatusDemo() {
  return (
    <StatusList
      className="max-w-2xl"
      summary="One failure in the last 24 hours"
      items={[
        { id: 'api', label: 'Public API', status: 'Operational', tone: 'ok' },
        { id: 'hooks', label: 'Webhooks', status: 'Operational', tone: 'ok', detail: 'Last delivery 2 min ago' },
        { id: 'export', label: 'Nightly export', status: 'Failed at 02:10', tone: 'failed', detail: 'Storage bucket refused the upload' },
        { id: 'search', label: 'Search index', status: 'Rebuilding', tone: 'neutral', detail: 'About 20 minutes left' },
      ]}
    />
  )
}

function initials(n: string) {
  return n.split(' ').map((p) => p[0]).join('').slice(0, 2)
}

function ItemListDemo() {
  const members = [
    { name: 'Ana Ruiz', email: 'ana@company.com', role: 'Owner' },
    { name: 'Ben Okafor', email: 'ben@company.com', role: 'Admin' },
    { name: 'Chloe Martin', email: 'chloe@company.com', role: 'Member' },
  ]
  return (
    <ItemList
      className="max-w-2xl"
      items={members.map((m) => ({
        id: m.email,
        name: m.name,
        description: m.email,
        meta: m.role,
        href: '#members',
        leading: (
          <Avatar size="sm">
            <AvatarFallback>{initials(m.name)}</AvatarFallback>
          </Avatar>
        ),
        action: <Button size="sm" variant="outline">Manage</Button>,
      }))}
    />
  )
}

// ---------------------------------------------------------------------------------------------- messages

function ToastButtons() {
  const { toast } = useToast()
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast({ title: 'Draft saved', description: 'Saved to Reports at 14:20.', tone: 'success', action: { label: 'Undo', onClick: () => {} } })}>
        Save draft
      </Button>
      <Button variant="outline" onClick={() => toast({ title: 'Upload failed', description: 'The file is larger than 5 MB.', tone: 'danger' })}>
        Try a failing upload
      </Button>
    </div>
  )
}

function ToastDemo() {
  return (
    <ToastProvider>
      <div className="flex flex-col gap-4">
        <ToastButtons />
        <div className="flex max-w-sm flex-col gap-2">
          <Caption>The toast surface, shown inline</Caption>
          <ToastCard title="Invite sent" description="Chloe gets an email with a link that works for 7 days." tone="success" onDismiss={() => {}} />
          <ToastCard title="Moved to Archive" action={{ label: 'Undo', onClick: () => {} }} onDismiss={() => {}} />
        </div>
      </div>
    </ToastProvider>
  )
}

function BannerDemo() {
  const [shown, setShown] = React.useState(true)
  return (
    <div className="flex flex-col gap-3">
      {shown ? (
        <Banner tone="warning" title="Your trial ends in 3 days." action={<Button size="sm" variant="outline">Add payment method</Button>} onDismiss={() => setShown(false)}>
          Projects stay readable after that, but nobody can edit them.
        </Banner>
      ) : (
        <Button variant="ghost" onClick={() => setShown(true)}>Show the banner again</Button>
      )}
      <Banner tone="info" title="Scheduled maintenance.">Sunday 02:00 to 03:00 UTC, sign in may be slow.</Banner>
    </div>
  )
}

function NotificationDemo() {
  const [items, setItems] = React.useState<NotificationItem[]>([
    { id: 'n1', title: 'Ben Okafor mentioned you in Q1 budget', body: 'Can you check the travel line before Friday?', time: '5 min', unread: true },
    { id: 'n2', title: 'Export finished', body: 'customers-march.csv is ready to download.', time: '1 h', unread: true },
    { id: 'n3', title: 'Chloe Martin joined Field team', time: 'Yesterday' },
    { id: 'n4', title: 'Your weekly summary is ready', time: 'Mon' },
  ])
  return (
    <NotificationList
      className="max-w-md"
      items={items}
      onSelect={(id) => setItems((l) => l.map((n) => (n.id === id ? { ...n, unread: false } : n)))}
      onMarkAllRead={() => setItems((l) => l.map((n) => ({ ...n, unread: false })))}
    />
  )
}

function EmptyDemo() {
  return (
    <div className="grid gap-x-8 sm:grid-cols-3">
      <EmptyState
        className="border-t border-border"
        kind="first-use"
        title="No reports yet"
        description="A report tracks one number over time. Start with the one you check most."
        action={<Button size="sm">Create report</Button>}
      />
      <EmptyState
        className="border-t border-border"
        kind="no-results"
        title="Nothing matches these filters"
        description="Check the spelling, or clear the status filter to search every task."
        action={<Button size="sm" variant="outline">Clear filters</Button>}
      />
      <EmptyState
        className="border-t border-border"
        kind="no-access"
        title="Only admins can see billing"
        description="Ask an owner of this workspace for access. They get your request by email."
        action={<Button size="sm" variant="outline">Request access</Button>}
      />
    </div>
  )
}

function SpinnerDemo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <Spinner label="Loading reports" />
      <Spinner size="md" label="Saving changes" />
      <Button variant="outline" disabled aria-busy="true">
        <Spinner label="Exporting" hideLabel /> Exporting
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- overlays

function DrawerDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Edit member</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit member</DrawerTitle>
            <DrawerDescription>Changes apply the next time Ana signs in.</DrawerDescription>
          </DrawerHeader>
          <DrawerBody className="flex flex-col gap-5">
            <Field label="Name">
              <Input defaultValue="Ana Ruiz" />
            </Field>
            <Field label="Role">
              <Select defaultValue="admin">
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </Select>
            </Field>
            <Switch defaultChecked label="Can invite people" />
          </DrawerBody>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button>Save</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">Sort by</Button>
        </DrawerTrigger>
        <DrawerContent side="bottom">
          <DrawerHeader>
            <DrawerTitle>Sort by</DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <RadioGroup
              legend="Sort order"
              hideLegend
              value="recent"
              onValueChange={() => {}}
              options={[
                { value: 'recent', label: 'Most recent' },
                { value: 'name', label: 'Name' },
                { value: 'due', label: 'Due date' },
              ]}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function ConfirmDemo() {
  const [open, setOpen] = React.useState(false)
  const [gone, setGone] = React.useState(false)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="destructive" onClick={() => setOpen(true)}>Delete project</Button>
      <span className="text-sm text-text-muted">{gone ? 'Project deleted.' : 'Opens a dialog that asks you to type the project name.'}</span>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete website-redesign?"
        description={
          <>
            The project, its 48 tasks and their files are deleted for everyone. Members keep their accounts. This cannot be undone.
          </>
        }
        confirmText="website-redesign"
        confirmLabel="Delete project"
        onConfirm={() => new Promise<void>((r) => setTimeout(() => { setGone(true); r() }, 600))}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- figures

function StatStripDemo() {
  return (
    <StatStrip
      stats={[
        { label: 'Open requests', value: '128', delta: { value: '12', dir: 'down' }, sub: 'vs last week' },
        { label: 'Median first reply', value: '2 h 40 min', delta: { value: '18 min', dir: 'down', neutral: true }, sub: 'vs last week' },
        { label: 'Resolved', value: '342', delta: { value: '9%', dir: 'up' }, sub: 'vs last week' },
        { label: 'Reopened', value: '4.1%', delta: { value: '0.6%p', dir: 'up', neutral: true } },
      ]}
      source="Help desk export, 1 to 7 March 2026"
    />
  )
}

function MeterDemo() {
  return (
    <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
      <Meter label="Storage" value={7.2} max={10} format={(n) => `${n} GB`} thresholds={[8]} caption="We email you at 8 GB. Uploads pause at 10 GB." />
      <Meter label="Seats" value={14} max={20} caption="6 seats left on this plan." />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- tables

interface FileRow { id: string; name: string; owner: string; updated: string; size: string }
const FILES: FileRow[] = [
  { id: 'f1', name: 'customers-march.csv', owner: 'Ana Ruiz', updated: 'Today', size: '4.4 KB' },
  { id: 'f2', name: 'q1-budget.xlsx', owner: 'Ben Okafor', updated: 'Yesterday', size: '86 KB' },
  { id: 'f3', name: 'contract-draft.pdf', owner: 'Chloe Martin', updated: '3 Mar', size: '1.2 MB' },
  { id: 'f4', name: 'logo-final.svg', owner: 'Dev Patel', updated: '28 Feb', size: '12 KB' },
]

function SelectableTableDemo() {
  const [sel, setSel] = React.useState<string[]>(['f2'])
  const [q, setQ] = React.useState('')
  const rows = FILES.filter((f) => f.name.includes(q.toLowerCase()))
  const columns: SelectableColumn<FileRow>[] = [
    { key: 'name', header: 'Name', cell: (r) => <span className="break-all">{r.name}</span> },
    { key: 'owner', header: 'Owner', cell: (r) => r.owner, hideBelow: 'sm' },
    { key: 'updated', header: 'Updated', cell: (r) => r.updated, hideBelow: 'md' },
    { key: 'size', header: 'Size', cell: (r) => r.size, align: 'right' },
  ]
  return (
    <SelectableTable
      rows={rows}
      columns={columns}
      getRowId={(r) => r.id}
      getRowLabel={(r) => r.name}
      selected={sel}
      onSelectedChange={setSel}
      caption="Files"
      toolbar={<SearchField className="max-w-xs" label="Filter files" value={q} onValueChange={setQ} shortcut={null} />}
      bulkActions={() => (
        <>
          <Button size="sm" variant="outline">Download</Button>
          <Button size="sm" variant="destructive">Delete</Button>
        </>
      )}
      emptyState="No files match this filter."
    />
  )
}

function SparklineTableDemo() {
  return (
    <SparklineTable
      className="max-w-2xl"
      caption="Weekly product numbers"
      labelHeader="Metric"
      valueHeader="This week"
      rows={[
        { id: 's', label: 'Sign ups', value: '1,284', change: { value: '+6.2%', dir: 'up' }, series: [920, 980, 1010, 1100, 1060, 1190, 1284] },
        { id: 'a', label: 'Activation rate', value: '41%', change: { value: '+1.5%p', dir: 'up' }, series: [36, 37, 39, 38, 40, 39.5, 41] },
        { id: 'w', label: 'Weekly active', value: '3,910', change: { value: '-0.8%', dir: 'down' }, series: [3980, 3950, 4010, 3990, 3940, 3942, 3910] },
        { id: 'c', label: 'Cancelled', value: '52', change: { value: '0', dir: 'flat' }, series: [50, 55, 49, 53, 52, 51, 52] },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------------------------- sequence

function StepperDemo() {
  const [cur, setCur] = React.useState(2)
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div>
        <Caption>Horizontal, short labels</Caption>
        <Stepper
          current={1}
          steps={[
            { id: 'account', label: 'Account' },
            { id: 'workspace', label: 'Workspace' },
            { id: 'invite', label: 'Invite' },
            { id: 'done', label: 'Done' },
          ]}
        />
      </div>
      <div>
        <Caption>Vertical, finished steps can be reopened</Caption>
        <Stepper
          orientation="vertical"
          current={cur}
          onStepClick={setCur}
          steps={[
            { id: 'upload', label: 'Upload the file', description: 'customers-march.csv, 420 rows' },
            { id: 'match', label: 'Match the columns', description: '6 of 6 matched' },
            { id: 'review', label: 'Review duplicates', description: '3 possible duplicates to check' },
            { id: 'import', label: 'Import', description: 'Runs in the background' },
          ]}
        />
      </div>
    </div>
  )
}

function WizardDemo() {
  const [name, setName] = React.useState('')
  const [emails, setEmails] = React.useState<string[]>([])
  const [finished, setFinished] = React.useState(false)
  if (finished) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-text">Workspace {name} is ready.</p>
        <Button variant="outline" size="sm" onClick={() => setFinished(false)}>Run it again</Button>
      </div>
    )
  }
  return (
    <Wizard
      className="max-w-xl"
      onFinish={() => setFinished(true)}
      steps={[
        {
          id: 'wz-name',
          title: 'Name the workspace',
          description: 'People see this name in invitations.',
          validate: () => (name.trim().length < 2 ? 'Enter a name with at least 2 characters.' : null),
          content: (
            <Field label="Workspace name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Field team" />
            </Field>
          ),
        },
        {
          id: 'wz-invite',
          title: 'Invite people',
          description: 'You can skip this and invite later.',
          content: <TagInput label="Email addresses" value={emails} onValueChange={setEmails} placeholder="name@company.com" />,
        },
        {
          id: 'wz-review',
          title: 'Review',
          content: (
            <DescriptionList
              items={[
                { term: 'Workspace', value: name },
                { term: 'Invites', value: emails.length ? emails.join(', ') : '' },
              ]}
              emptyLabel="None"
            />
          ),
        },
      ]}
    />
  )
}

const EVENTS: ActivityEvent[] = [
  { id: 'e1', day: 'Today', actor: 'Ana Ruiz', action: 'moved Invoice 1043 to Sent', time: '14:20' },
  { id: 'e2', day: 'Today', actor: 'Ben Okafor', action: 'commented on Q1 budget', time: '11:05', detail: '"The travel line looks high, can we split it by team?"' },
  { id: 'e3', day: 'Yesterday', actor: 'Chloe Martin', action: 'changed the due date from 21 to 28 March', time: '16:42' },
  { id: 'e4', day: 'Yesterday', actor: 'Dev Patel', action: 'uploaded logo-final.svg', time: '09:30' },
]

function ShortcutsDemo() {
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <div className="flex flex-col divide-y divide-border border-y border-border">
        <ShortcutHint label="Search" keys={['/']} />
        <ShortcutHint label="Command palette" keys={['mod', 'K']} />
        <ShortcutHint label="New task" keys={['N']} />
        <ShortcutHint label="Go to inbox" keys={['G', 'I']} />
      </div>
      <p className="text-sm text-text-muted">
        Press <Kbd>?</Kbd> anywhere to see every shortcut.
      </p>
    </div>
  )
}

export function AppSections() {
  return (
    <>
      <Section id="blocks/sidebar-nav" title="Sidebar nav"><SidebarDemo /></Section>
      <Section id="blocks/location-map" title="Location map"><MapDemo /></Section>
      <Section id="blocks/theme-scope" title="Theme scope"><ThemeScopeDemo /></Section>
      <Section id="blocks/settings-section" title="Settings page and section"><SettingsDemo /></Section>
      <Section id="blocks/master-detail" title="Master detail"><MasterDetailDemo /></Section>
      <Section id="blocks/underline-tabs" title="Underline tabs"><UnderlineTabsDemo /></Section>
      <Section id="blocks/pagination" title="Pagination"><PaginationDemo /></Section>
      <Section id="blocks/page-toc" title="On this page"><TocDemo /></Section>
      <Section id="blocks/button-group" title="Button group"><ButtonGroupDemo /></Section>
      <Section id="blocks/copy-button" title="Copy button"><CopyDemo /></Section>
      <Section id="blocks/field" title="Field"><FieldDemo /></Section>
      <Section id="blocks/textarea" title="Textarea"><TextareaDemo /></Section>
      <Section id="blocks/search-field" title="Search field"><SearchDemo /></Section>
      <Section id="blocks/filter-chips" title="Filter chips"><ChipsDemo /></Section>
      <Section id="blocks/radio-group" title="Radio group"><RadioDemo /></Section>
      <Section id="blocks/checkbox-group" title="Checkbox group"><CheckboxGroupDemo /></Section>
      <Section id="blocks/slider" title="Slider"><SliderDemo /></Section>
      <Section id="blocks/switch-list" title="Switch list"><SwitchListDemo /></Section>
      <Section id="blocks/file-dropzone" title="File dropzone"><DropzoneDemo /></Section>
      <Section id="blocks/tag-input" title="Tag input"><TagDemo /></Section>
      <Section id="blocks/otp-input" title="One-time code"><OtpDemo /></Section>
      <Section id="blocks/description-list" title="Description list"><DescriptionDemo /></Section>
      <Section id="blocks/status-list" title="Status list"><StatusDemo /></Section>
      <Section id="blocks/item-list" title="Item list"><ItemListDemo /></Section>
      <Section id="blocks/toast" title="Toast"><ToastDemo /></Section>
      <Section id="blocks/banner" title="Banner"><BannerDemo /></Section>
      <Section id="blocks/notification-list" title="Notification list"><NotificationDemo /></Section>
      <Section id="blocks/empty-state" title="Empty state"><EmptyDemo /></Section>
      <Section id="blocks/spinner" title="Spinner"><SpinnerDemo /></Section>
      <Section id="blocks/drawer" title="Drawer and bottom sheet"><DrawerDemo /></Section>
      <Section id="blocks/confirm-dialog" title="Confirm dialog"><ConfirmDemo /></Section>
      <Section id="blocks/stat-strip" title="Stat strip"><StatStripDemo /></Section>
      <Section id="blocks/meter" title="Meter"><MeterDemo /></Section>
      <Section id="blocks/selectable-table" title="Selectable table"><SelectableTableDemo /></Section>
      <Section id="blocks/sparkline-table" title="Sparkline table"><SparklineTableDemo /></Section>
      <Section id="blocks/stepper" title="Stepper"><StepperDemo /></Section>
      <Section id="blocks/wizard" title="Wizard"><WizardDemo /></Section>
      <Section id="blocks/activity-feed" title="Activity feed"><ActivityFeed className="max-w-xl" events={EVENTS} /></Section>
      <Section id="blocks/kbd" title="Keyboard keys"><ShortcutsDemo /></Section>
    </>
  )
}
