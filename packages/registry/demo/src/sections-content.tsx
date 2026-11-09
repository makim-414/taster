import * as React from 'react'
import {
  ProductHero,
  SplitFormHero,
  PhotoHero,
  FeatureRows,
  FeatureGrid,
  PlanTable,
  UsageEstimator,
  PlanRows,
  CtaBand,
  InlineSignup,
  AudienceSplit,
  CustomerQuote,
  CaseStudyGrid,
  LogoWall,
  FaqGroups,
  SiteHeader,
  Breadcrumb,
  SiteFooter,
  SlimFooter,
  SectionHeading,
  Prose,
  Article,
  FootnotesProvider,
  FootnoteRef,
  Footnotes,
  PullQuote,
  CodeBlock,
  GalleryLightbox,
  BeforeAfter,
  SnapCarousel,
  ProductGrid,
  ProductGallery,
  BuyBox,
  Cart,
  type CartLine,
  ChatThread,
  type ChatMessage,
  MessageComposer,
  ToolCall,
  ToolCallGroup,
  AgentStatus,
  ApprovalStep,
  ScrollEnter,
  PointField,
  PointGlobe,
  type GlobeMarker,
} from '../../src'
import { plate } from './placeholder'
import { ONLY } from './stage'

// Demo sections for the page section, content, media, commerce, chat, motion and scene components.
// Sample content is generic: no brand names, no invented big numbers, placeholders say what they stand for.

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  if (ONLY) return ONLY === id ? <section data-registry-id={id} className="min-w-0"><div className="min-w-0">{children}</div></section> : null
  return (
    <section data-registry-id={id} className="mb-16 min-w-0">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-title font-semibold tracking-tight">{title}</h2>
        <code className="text-caption text-text-subtle">{id}</code>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const SHOT = plate('Product screenshot, 1440 by 900', 1440, 900, 'e', 'screen')

const FEATURE_ROWS = [
  {
    id: 'forecast',
    label: 'Forecast',
    title: 'A paid-by date on every open invoice',
    body: 'Each morning the ledger is read again and every open invoice gets the date it is most likely to be paid, with the one reason that moved it.',
    points: ['Reasons in plain words', 'Updated before the workday starts', 'Exports to CSV'],
    link: { label: 'How the date is estimated', href: '#forecast' },
    media: { src: plate('Invoice list screenshot', 1280, 800, 'e', 'screen'), alt: 'Invoice list with a paid-by date column', width: 1280, height: 800 },
    caption: 'Sample data. The paid-by column is sorted earliest first.',
  },
  {
    id: 'reminders',
    label: 'Reminders',
    title: 'Reminders that go out in your name, at your hours',
    body: 'Pick the tone and the days. The draft is shown before it is sent the first time, and every message is logged against the invoice.',
    media: { src: plate('Reminder editor screenshot', 1280, 960, 'c', 'screen'), alt: 'Reminder editor with a preview of the email', width: 1280, height: 960 },
    caption: 'The editor with the preview open.',
  },
  {
    id: '거래처',
    lang: 'ko',
    label: '거래처 정리',
    title: '연락이 끊긴 거래처를 마지막 거래일 순서로 보여 줍니다',
    body: '미수금이 남은 곳부터 위로 올라오고, 담당자에게 마지막으로 보낸 메일이 함께 표시됩니다.',
    media: { src: plate('Customer list screenshot', 1280, 720, 'e', 'screen'), alt: '마지막 거래일 순으로 정렬한 거래처 목록', width: 1280, height: 720 },
  },
]

const FEATURES = [
  { title: 'Two widths, every time', body: 'Each page is opened at a desktop and a phone width, so a layout that only breaks on phones is still caught.' },
  { title: 'Computed styles', body: 'Checks read what the browser actually applied, not the class names in the source.' },
  { title: 'Exact counts', body: 'Every finding has a selector, a measured value and the threshold it crossed.', link: { label: 'See a sample finding', href: '#features' } },
  { title: 'Fix patterns', body: 'Each rule points to a pattern page with a before and after you can copy.' },
  { lang: 'ko', title: '한국어 줄바꿈 검사', body: '단어 중간에서 줄이 바뀌는 곳을 찾아 위치와 함께 알려 줍니다.' },
  { title: 'Runs locally', body: 'Point it at a local server or a file. Nothing leaves your machine unless you send it.' },
]

const TABLE_PLANS = [
  { id: 'starter', name: 'Starter', price: '$0', period: 'per month', cta: { label: 'Start free', href: '#plans' } },
  { id: 'team', name: 'Team', price: '$49', period: 'per month', cta: { label: 'Start a trial', href: '#plans' }, recommended: true },
  { id: 'business', name: 'Business', price: '$199', period: 'per month', cta: { label: 'Talk to us', href: '#plans' } },
]
const TABLE_GROUPS = [
  {
    title: 'Checks',
    rows: [
      { label: 'Sites', values: { starter: '1', team: '10', business: 'Unlimited' } },
      { label: 'Check frequency', values: { starter: 'Weekly', team: 'Daily', business: 'On every deploy' } },
      { label: 'Phone and desktop widths', values: { starter: true, team: true, business: true } },
    ],
  },
  {
    title: 'Team',
    rows: [
      { label: 'Seats', values: { starter: '1', team: '5', business: '25' } },
      { label: 'Shared reports', note: 'Links that open without an account', values: { starter: false, team: true, business: true } },
      { label: 'Single sign-on', values: { starter: false, team: false, business: true } },
    ],
  },
]

const METERS = [
  { id: 'pages', label: 'Pages checked per month', unit: 'pages', min: 0, max: 5000, step: 50, included: 200, rate: 0.04, rateLabel: 'per page' },
  { id: 'api', label: 'API calls per month', unit: 'calls', min: 0, max: 200000, step: 1000, included: 10000, rate: 2, per: 1000, rateLabel: 'per 1,000 calls' },
]
const PRESETS = [
  { label: 'Solo', values: { pages: 150, api: 2000 } },
  { label: 'Small team', values: { pages: 900, api: 25000 } },
  { label: 'Agency', values: { pages: 3500, api: 120000 } },
]

const ROW_PLANS = [
  {
    id: 'solo',
    name: 'Solo',
    blurb: 'For one person checking their own sites.',
    price: { monthly: '$19', yearly: '$16' },
    note: { yearly: 'Billed $190 yearly' },
    features: ['1 site', 'Weekly checks', 'Annotated captures'],
    cta: { label: 'Start free', href: '#plans' },
  },
  {
    id: 'team',
    name: 'Team',
    blurb: 'For a small team that reviews every page before it ships.',
    price: { monthly: '$79', yearly: '$66' },
    note: { monthly: '5 seats included', yearly: 'Billed $790 yearly, 5 seats included' },
    features: ['10 sites', 'Daily checks at two widths', 'Alerts when a rule regresses', 'API access'],
    cta: { label: 'Start a trial', href: '#plans' },
    recommended: true,
  },
]

const STUDIES = [
  {
    href: '#case-1',
    result: 'Checkout errors down from 31 to 4 a week',
    measured: 'Support tickets tagged checkout, Mar to May',
    who: 'An online store with a three-person team',
    summary: 'They ran the check on every pull request and fixed the forms it flagged on phones first.',
    cover: { src: plate('Photo of the team at work', 1600, 1000, 'b'), alt: 'Placeholder for a photo of the team' },
  },
  {
    href: '#case-2',
    result: 'Release review from two days to half a day',
    measured: 'Median over 14 releases',
    who: 'A product studio working for clients',
    summary: 'Shared reports replaced screenshots pasted into chat, so clients saw the same findings the designers did.',
    cover: { src: plate('Photo of the studio', 1600, 1000, 'c'), alt: 'Placeholder for a photo of the studio' },
  },
  {
    href: '#case-3',
    lang: 'ko',
    result: '한국어 제목 줄바꿈 오류 46곳을 한 주에 정리',
    measured: '사내 페이지 120개 기준, 9월 둘째 주',
    who: '사내 문서 사이트를 운영하는 두 명의 팀',
    summary: '긴 제목이 단어 중간에서 끊기던 곳을 찾아 한꺼번에 고쳤습니다.',
    cover: { src: plate('Photo of the office', 1600, 1000, 'd'), alt: '사무실 사진 자리' },
  },
]

const FAQ_GROUPS = [
  {
    title: 'Billing',
    items: [
      { q: 'Can I change plans in the middle of a month?', a: 'Yes. The change applies at once and the difference is prorated on the next invoice.' },
      { q: 'Do you offer refunds?', a: 'Within 14 days of a charge, write to us and we refund it in full, no questions asked.' },
      { lang: 'ko', q: '세금계산서를 받을 수 있나요?', a: '네. 결제 정보에 사업자 정보를 넣으면 결제일마다 자동으로 발행됩니다.' },
    ],
  },
  {
    title: 'Data',
    items: [
      { q: 'Where are captures stored?', a: 'In the region you pick when you create the workspace. They are deleted 90 days after the run.' },
      { q: 'Can I run checks on a page behind a login?', a: 'Yes, from a local run. The hosted check only opens public pages.' },
    ],
  },
]

const ARTICLE_BODY = (
  <>
    <p>
      Most generated pages do not fail because of one big mistake. They fail because of a dozen small defaults that nobody chose: a font
      that came with the template, a gap that is the same everywhere, a card around every paragraph.
    </p>
    <h2>Start with the type</h2>
    <p>
      Pick one family that covers every script you publish in. For a page that mixes English and Korean, that means a face drawn for both,
      or a pair that shares x-height and weight.
    </p>
    <h3>Line length</h3>
    <p>Keep a reading column near 65 characters. Korean reads well a little shorter, about 36 full-width characters a line.</p>
    <h2>Then the spacing</h2>
    <p>Use different distances for different relationships. Items in a group sit closer together than the groups do.</p>
    <blockquote>Uniform spacing hides structure. The reader cannot tell what belongs together.</blockquote>
    <h2 lang="ko">한국어 문단</h2>
    <p lang="ko">
      한국어 본문은 줄 간격을 영어보다 조금 넓게 두고, 단어가 중간에서 끊기지 않도록 어절 단위로 줄을 바꿉니다. 양쪽 정렬은 어절
      사이를 고르지 않게 벌리므로 쓰지 않습니다.
    </p>
  </>
)

const NOTES = [
  { id: 'measure', content: 'The 65 character figure is a common rule of thumb for Latin text, not a hard limit.' },
  { id: 'ko', content: '한국어 기준은 전각 글자 수로 셉니다.' },
]

const GALLERY = [
  { src: plate('Photo 1', 1200, 900, 'a'), alt: 'Placeholder for the workshop, wide view', caption: 'The workshop, wide view.' },
  { src: plate('Photo 2', 1200, 900, 'b'), alt: 'Placeholder for a walnut table top', caption: 'Walnut table top before oiling.' },
  { src: plate('Photo 3', 1200, 900, 'c'), alt: 'Placeholder for joinery detail', caption: 'Joinery detail, no screws.' },
  { src: plate('Photo 4', 1200, 900, 'd'), alt: 'Placeholder for a finished chair', caption: 'A finished chair in oak.' },
  { src: plate('Photo 5', 1200, 900, 'e'), alt: 'Placeholder for the bench room', caption: 'The bench room.' },
  { src: plate('Photo 6', 1200, 900, 'a'), alt: 'Placeholder for the delivery van', caption: 'Ready for delivery.' },
]

const CAROUSEL = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i}`,
  image: { src: plate(`Project photo ${i + 1}`, 800, 1000, (['a', 'b', 'c', 'd', 'e', 'a'] as const)[i]), alt: `Placeholder for project ${i + 1}` },
  title: ['Kitchen shelving', 'Reading chair', 'Hall bench', '서재 책장', 'Dining table', 'Bedside table'][i],
  body: ['Oak, wall mounted', 'Walnut and wool', 'Ash, 140 cm', '참나무, 5단', 'Oak, seats six', 'Walnut, one drawer'][i],
  href: `#project-${i + 1}`,
  lang: i === 3 ? 'ko' : undefined,
}))

const PRODUCTS = [
  { id: 'p1', href: '#p1', name: 'Oak side table', descriptor: '45 cm, oiled', price: '$320', image: { src: plate('Product photo', 800, 1000, 'b'), alt: 'Placeholder for the oak side table' }, hoverImage: { src: plate('Product in a room', 800, 1000, 'd') } },
  { id: 'p2', href: '#p2', name: 'Walnut tray', descriptor: 'Two sizes', price: '$64', was: '$80', image: { src: plate('Product photo', 800, 1000, 'c'), alt: 'Placeholder for the walnut tray' }, status: 'Only 3 left' },
  { id: 'p3', lang: 'ko', href: '#p3', name: '참나무 도마', descriptor: '대형, 손잡이 있음', price: '$48', image: { src: plate('Product photo', 800, 1000, 'a'), alt: '참나무 도마 사진 자리' } },
  { id: 'p4', href: '#p4', name: 'Wool seat pad', descriptor: '4 colors', price: '$36', image: { src: plate('Product photo', 800, 1000, 'e'), alt: 'Placeholder for the wool seat pad' }, status: 'Back in May' },
]

const PDP_IMAGES = [
  { src: plate('Front view', 1000, 1250, 'b'), alt: 'Oak side table, front view' },
  { src: plate('Side view', 1000, 1250, 'c'), alt: 'Oak side table, side view' },
  { src: plate('Detail of the joint', 1000, 1250, 'a'), alt: 'Oak side table, joint detail' },
  { src: plate('In a room', 1000, 1250, 'd'), alt: 'Oak side table in a living room' },
]

const CART_START: CartLine[] = [
  { id: 'c1', name: 'Oak side table', options: '45 cm, oiled', unitPrice: 320, quantity: 1, image: { src: plate('Item', 144, 144, 'b'), alt: 'Oak side table' }, href: '#p1' },
  { id: 'c2', lang: 'ko', name: '참나무 도마', options: '대형', unitPrice: 48, quantity: 2, image: { src: plate('Item', 144, 144, 'a'), alt: '참나무 도마' } },
]

const MARKERS: GlobeMarker[] = [
  { id: 'seoul', label: 'Seoul', lat: 37.57, lon: 126.98, note: 'workshop and office' },
  { id: 'lisbon', label: 'Lisbon', lat: 38.72, lon: -9.14, note: 'showroom' },
  { id: 'toronto', label: 'Toronto', lat: 43.65, lon: -79.38, note: 'shipping partner' },
]

function CartDemo() {
  const [lines, setLines] = React.useState(CART_START)
  return (
    <Cart
      lines={lines}
      onQuantity={(id, q) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, quantity: q } : l)))}
      onRemove={(id) => setLines((ls) => ls.filter((l) => l.id !== id))}
      shipping={0}
      tax={null}
      taxNote="Included in prices"
      freeShippingAt={300}
      checkout={{ label: 'Go to checkout', href: '#checkout' }}
      emptyMessage={
        <>
          Your cart is empty.{' '}
          <button type="button" className="underline underline-offset-4" onClick={() => setLines(CART_START)}>
            Put the sample items back
          </button>
        </>
      }
    />
  )
}

const THREAD: ChatMessage[] = [
  { id: 'm1', role: 'user', content: 'Which invoices are most likely to be paid late this month?', time: '09:12' },
  {
    id: 'm2',
    role: 'assistant',
    time: '09:12',
    text: 'Three invoices are likely to be paid after their due date.',
    content: (
      <div className="grid gap-3">
        <ToolCall status="done" title="Read the ledger" summary="48 open invoices" />
        <p>Three invoices are likely to be paid after their due date. The largest is for the March order, which has slipped twice before.</p>
      </div>
    ),
  },
  { id: 'm3', lang: 'ko', role: 'user', content: '그중에 이번 주에 연락해야 할 곳만 다시 정리해 줘.', time: '09:13' },
  {
    id: 'm4',
    lang: 'ko',
    role: 'assistant',
    text: '이번 주에 연락할 곳은 두 곳입니다.',
    content: <p>이번 주에 연락할 곳은 두 곳입니다. 둘 다 지난달에도 지급일을 한 번 미룬 적이 있어서, 마감 사흘 전에 먼저 알리는 편이 좋습니다.</p>,
  },
]

function ThreadDemo() {
  return (
    <div className="h-[420px] max-w-3xl">
      <ChatThread messages={THREAD} className="h-full" />
    </div>
  )
}

function ComposerDemo() {
  const [sent, setSent] = React.useState<string | null>(null)
  const [streaming, setStreaming] = React.useState(false)
  return (
    <div className="max-w-3xl">
      <MessageComposer
        accept="image/*,.pdf,.csv"
        streaming={streaming}
        onStop={() => setStreaming(false)}
        onSend={({ text, files }) => {
          setSent(`${text || '(no text)'}${files.length ? `, ${files.length} file(s)` : ''}`)
          setStreaming(true)
          window.setTimeout(() => setStreaming(false), 2500)
        }}
        hint="Enter sends, Shift+Enter adds a line. Files: images, PDF or CSV, up to 5."
      />
      <p className="mt-3 text-label text-text-subtle">Last sent in this demo: {sent ?? 'nothing yet'}</p>
    </div>
  )
}

function StatusDemo() {
  const [started] = React.useState(() => Date.now() - 42000)
  const [stopped, setStopped] = React.useState(false)
  return (
    <div className="max-w-3xl">
      {stopped ? (
        <p className="text-body text-text-muted">
          Stopped by you.{' '}
          <button type="button" className="underline underline-offset-4" onClick={() => setStopped(false)}>
            Run again
          </button>
        </p>
      ) : (
        <AgentStatus step="Comparing the two price lists" steps={['Read the March price list', 'Read the April price list']} startedAt={started} onStop={() => setStopped(true)} />
      )}
    </div>
  )
}

function ApprovalDemo() {
  const [key, setKey] = React.useState(0)
  return (
    <div className="max-w-3xl">
      <ApprovalStep
        key={key}
        autoFocus={false}
        question="Send the reminder to the 3 customers with overdue invoices?"
        context="Each gets the template you approved last week, signed with your name."
        options={[
          { id: 'send', label: 'Send to 3 customers', detail: 'Goes out now', recommended: true },
          { id: 'draft', label: 'Save as drafts', detail: 'Nothing is sent' },
        ]}
        onAnswer={() => window.setTimeout(() => setKey((k) => k + 1), 2500)}
        onCancel={() => setKey((k) => k + 1)}
      />
    </div>
  )
}

function SignupHero() {
  return (
    <div lang="ko">
      <SplitFormHero
        as="h2"
        eyebrow="거래처 정리"
        title="거래처 목록을 올리면 연락이 끊긴 곳부터 정리해 드립니다"
        lead="엑셀 파일 하나면 됩니다. 마지막 거래일과 미수금을 기준으로 다시 연락할 순서를 매깁니다."
        field={{ label: '업무용 이메일', type: 'email', placeholder: 'name@example.com' }}
        submitLabel="시작하기"
        helper="입력한 주소로 업로드 링크를 보냅니다. 보통 1분 안에 도착합니다."
        onSubmit={() => wait(600)}
        doneMessage={(v) => `데모 화면이라 ${v} 주소로 실제 메일을 보내지는 않았습니다.`}
        aside={
          <figure className="m-0">
            <img src={plate('Sample result screenshot', 1200, 900, 'e', 'screen')} alt="정리된 거래처 목록 예시 화면" width={1200} height={900} className="block h-auto w-full rounded-xl border border-border" />
            <figcaption className="mt-3 text-label text-text-subtle">예시 데이터로 만든 결과 화면입니다.</figcaption>
          </figure>
        }
      />
    </div>
  )
}

export function ContentSections() {
  return (
    <>
      <Section id="marketing/product-hero" title="Product hero">
        <ProductHero
          as="h2"
          title="Know which invoices will be paid late, a week before they are due"
          lead="Connect your ledger. Each open invoice gets the date it is likely to be paid and the reason, updated every morning."
          primary={{ label: 'Connect a ledger', href: '#connect' }}
          secondary={{ label: 'See a sample report', href: '#sample' }}
          proof="Forecasts use the last 24 months of your own payments. Updated daily at 06:00."
          media={{ src: SHOT, alt: 'Open invoices ranked by the chance of a late payment', width: 1440, height: 900 }}
          mediaLabel="Sample data"
          caption="Open invoices ranked by the chance of a late payment."
        />
      </Section>

      <Section id="marketing/split-form-hero" title="Split form hero">
        <SignupHero />
      </Section>

      <Section id="marketing/photo-hero" title="Photo hero">
        <PhotoHero
          as="h2"
          size="medium"
          image={{ src: plate('', 2000, 1200, 'd'), alt: 'Placeholder for a photo of the workshop' }}
          title="Furniture made to order in a two-person workshop"
          lead="Solid oak and walnut, joined without screws, delivered in six to eight weeks."
          action={{ label: "See this season's pieces", href: '#pieces' }}
          credit="Photo placeholder"
        />
      </Section>

      <Section id="content/section-heading" title="Section heading">
        <div className="grid gap-12">
          <SectionHeading eyebrow="How it works" title="One check, two widths, every rule" link={{ label: 'Read the rules', href: '#rules' }}>
            Each page is opened at a desktop and a phone width and read against the same rules.
          </SectionHeading>
          <div lang="ko">
            <SectionHeading layout="split" eyebrow="한국어 제목" title="긴 한국어 제목도 단어 중간에서 끊기지 않습니다">
              어절 단위로 줄을 바꾸고, 제목은 줄 길이를 고르게 맞춥니다. 좁은 화면에서도 같은 규칙을 따릅니다.
            </SectionHeading>
          </div>
        </div>
      </Section>

      <Section id="marketing/feature-rows" title="Feature rows">
        <FeatureRows rows={FEATURE_ROWS} />
      </Section>

      <Section id="marketing/feature-grid" title="Feature grid">
        <FeatureGrid items={FEATURES} />
      </Section>

      <Section id="marketing/logo-wall" title="Logo wall">
        <LogoWall
          caption="Used by teams at"
          items={[{ name: 'Customer one' }, { name: 'Customer two' }, { name: 'Customer three' }, { name: 'Customer four' }, { name: 'Customer five' }]}
        />
      </Section>

      <Section id="marketing/customer-quote" title="Customer quote">
        <CustomerQuote
          result="Reopened tickets down 41% in 8 weeks"
          quote="We stopped arguing about whether a page looked finished. The report says what is off and where, and the fix is usually one line."
          name="Name Surname"
          role="Head of support"
          org="a regional grocer"
          link={{ label: 'Read the case', href: '#case' }}
        />
      </Section>

      <Section id="marketing/case-study-card" title="Case study card">
        <CaseStudyGrid studies={STUDIES} />
      </Section>

      <Section id="content/pull-quote" title="Pull quote">
        <div lang="ko">
          <PullQuote quote="화면이 끝났는지는 느낌으로 정할 일이 아니었습니다. 어디가 어긋났는지 숫자로 보이니까 회의가 짧아졌어요." name="이름 성" detail="디자인 리드, 사내 도구 팀" />
        </div>
      </Section>

      <Section id="marketing/plan-table" title="Plan table">
        <PlanTable plans={TABLE_PLANS} groups={TABLE_GROUPS} caption="Plans compared by feature" />
      </Section>

      <Section id="marketing/plan-rows" title="Plan rows">
        <PlanRows plans={ROW_PLANS} periods={{ monthly: 'Monthly', yearly: 'Yearly, 2 months free' }} />
      </Section>

      <Section id="marketing/usage-estimator" title="Usage estimator">
        <UsageEstimator
          meters={METERS}
          presets={PRESETS}
          base={29}
          hint={(v) => (v.pages > 2500 ? 'At this volume, the Business plan costs less than paying for extra pages.' : 'Team covers this with room to grow.')}
          footnote="Sample rates for the demo, last updated 1 Oct 2026. Taxes not included."
        />
      </Section>

      <Section id="marketing/inline-signup" title="Inline signup">
        <InlineSignup
          title="Get the release notes"
          body="One email per release, about once a month. Nothing else."
          label="Email"
          placeholder="you@example.com"
          submitLabel="Get release notes"
          note="We store only the address. Every email has a one-click unsubscribe link."
          onSubmit={() => wait(600)}
          doneMessage={(e) => `Demo only: nothing was sent to ${e}.`}
        />
      </Section>

      <Section id="marketing/faq-groups" title="FAQ groups">
        <FaqGroups groups={FAQ_GROUPS} />
      </Section>

      <Section id="marketing/audience-split" title="Audience split">
        <AudienceSplit
          title="Which describes you?"
          doors={[
            { title: 'I sell online', body: 'Check product pages, the cart and checkout at phone width before a sale goes live.', href: '#online', linkLabel: 'See the store guide' },
            { title: 'I run a studio', body: 'Share one report with a client instead of a folder of screenshots.', href: '#studio', linkLabel: 'See the studio guide' },
          ]}
          footer={
            <>
              Not sure?{' '}
              <a href="#contact" className="font-medium text-text underline underline-offset-4">
                Write to us
              </a>
              .
            </>
          }
        />
      </Section>

      <Section id="marketing/cta-band" title="CTA band">
        <CtaBand
          title="Run your first check in two minutes"
          primary={{ label: 'Check a page', href: '#start' }}
          secondary={{ label: 'See a sample report', href: '#sample' }}
          note="Free for one site. No card needed."
        />
      </Section>

      <Section id="marketing/site-header" title="Site header">
        <SiteHeader
          brand="Wordmark"
          brandHref="#top"
          links={[
            {
              label: 'Product',
              href: '#product',
              items: [
                { label: 'Checks', href: '#checks', description: 'What is measured and at which widths' },
                { label: 'Reports', href: '#reports', description: 'Share findings with a link' },
                { label: 'API', href: '#api', description: 'Run checks from your pipeline' },
              ],
            },
            { label: 'Pricing', href: '#pricing', current: true },
            { label: 'Docs', href: '#docs' },
            { label: 'Changelog', href: '#changelog' },
          ]}
          signIn={{ label: 'Sign in', href: '#signin' }}
          action={{ label: 'Start free', href: '#start' }}
        />
      </Section>

      <Section id="marketing/breadcrumb" title="Breadcrumb">
        <Breadcrumb items={[{ label: 'Home', href: '#home' }, { label: 'Docs', href: '#docs' }, { label: 'Guides', href: '#guides' }, { label: 'Billing', href: '#billing' }, { label: 'Refund a payment' }]} />
      </Section>

      <Section id="content/article" title="Article">
        <Article
          as="h2"
          section="Guides"
          title="Why generated pages look generated"
          standfirst="A short tour of the defaults that give a page away, and what to choose instead."
          meta={['Name Surname', '12 Oct 2026', '4 min read']}
        >
          {ARTICLE_BODY}
        </Article>
      </Section>

      <Section id="content/prose" title="Prose">
        <Prose>
          <h2>Install</h2>
          <p>
            Copy <code>tokens.css</code> into your app and import it once at the root. Every component reads these variables, so nothing renders
            correctly without them.
          </p>
          <ul>
            <li>Tokens first, components second.</li>
            <li>Keep a Hangul family in the font stack.</li>
          </ul>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>--t-body</td>
                <td>14px</td>
              </tr>
              <tr>
                <td>--lh-normal</td>
                <td>1.5</td>
              </tr>
            </tbody>
          </table>
        </Prose>
      </Section>

      <Section id="content/footnotes" title="Footnotes">
        <FootnotesProvider notes={NOTES} prefix="demo-fn">
          <Prose>
            <p>
              A reading column works best at around 65 characters a line
              <FootnoteRef id="measure" />, and a Korean column a little shorter than that, measured in full-width characters
              <FootnoteRef id="ko" />.
            </p>
          </Prose>
          <Footnotes notes={NOTES} />
        </FootnotesProvider>
      </Section>

      <Section id="content/code-block" title="Code block">
        <div className="grid max-w-3xl gap-6">
          <CodeBlock
            label="tailwind.config.cjs"
            language="js"
            lineNumbers
            code={`module.exports = {\n  presets: [require('./tailwind-preset.cjs')],\n  content: ['./src/**/*.{ts,tsx}'],\n}\n`}
          />
          <CodeBlock label="Terminal" language="bash" code={'npm install\nnpm run typecheck'} />
        </div>
      </Section>

      <Section id="media/gallery-lightbox" title="Gallery with lightbox">
        <GalleryLightbox images={GALLERY} />
      </Section>

      <Section id="media/before-after" title="Before and after">
        <div className="max-w-3xl">
          <BeforeAfter
            before={{ src: plate('Original', 1200, 800, 'a'), alt: 'Placeholder for the original photo' }}
            after={{ src: plate('Retouched', 1200, 800, 'd'), alt: 'Placeholder for the retouched photo' }}
            labels={{ before: 'Original', after: 'Retouched' }}
            caption="Drag the divider, or focus it and use the arrow keys."
          />
        </div>
      </Section>

      <Section id="media/snap-carousel" title="Snap carousel">
        <SnapCarousel label="Recent projects" items={CAROUSEL} />
      </Section>

      <Section id="commerce/product-card" title="Product card">
        <ProductGrid products={PRODUCTS} />
      </Section>

      <Section id="commerce/product-gallery" title="Product gallery">
        <div className="max-w-xl">
          <ProductGallery images={PDP_IMAGES} />
        </div>
      </Section>

      <Section id="commerce/buy-box" title="Buy box">
        <BuyBox
          as="h2"
          name="Oak side table"
          descriptor="Solid oak, oiled by hand. Made to order."
          price={320}
          options={[
            { id: 'size', label: 'Size', values: [{ value: '45', label: '45 cm' }, { value: '55', label: '55 cm' }, { value: '65', label: '65 cm', soldOut: true }] },
            { id: 'finish', label: 'Finish', values: [{ value: 'oiled', label: 'Oiled' }, { value: 'smoked', label: 'Smoked' }] },
          ]}
          onAdd={() => wait(500)}
          note="Ships in 6 to 8 weeks. Free returns within 30 days."
        />
      </Section>

      <Section id="commerce/cart" title="Cart">
        <CartDemo />
      </Section>

      <Section id="chat/chat-thread" title="Chat thread">
        <ThreadDemo />
      </Section>

      <Section id="chat/message-composer" title="Message composer">
        <ComposerDemo />
      </Section>

      <Section id="chat/tool-call" title="Tool call">
        <div className="max-w-3xl">
          <ToolCallGroup label="Used 3 tools" status="running" defaultOpen>
            <ToolCall status="done" title="Searched the ledger" summary="48 open invoices" args={'{ "status": "open", "due_before": "2026-11-30" }'} result="48 rows" />
            <ToolCall status="failed" title="Read the bank feed" summary="The connection expired" result="401 Unauthorized. Reconnect the bank in Settings." elapsedMs={3200} />
            <ToolCall status="running" title="Drafting the reminders" summary="3 of 5" />
          </ToolCallGroup>
        </div>
      </Section>

      <Section id="chat/agent-status" title="Agent status">
        <StatusDemo />
      </Section>

      <Section id="chat/approval-step" title="Approval step">
        <ApprovalDemo />
      </Section>

      <Section id="motion/scroll-enter" title="Scroll enter">
        <ScrollEnter stagger className="grid max-w-3xl gap-3">
          <p className="text-title font-semibold text-text">This block arrives once, the first time it scrolls into view.</p>
          <p className="text-body text-text-muted">Content above the fold, without script or with reduced motion is never hidden.</p>
        </ScrollEnter>
      </Section>

      <Section id="motion/point-field" title="Point field">
        <PointField className="rounded-xl bg-bg-sunken">
          <div className="flex min-h-[280px] max-w-xl flex-col justify-end p-8">
            <p className="text-h2 font-semibold text-text">A quiet field of points behind the content</p>
            <p className="mt-2 text-body text-text-muted">It stops when it leaves the screen and draws one still frame under reduced motion.</p>
          </div>
        </PointField>
      </Section>

      <Section id="scene/point-globe" title="Point globe">
        <PointGlobe label="Globe with three places marked" markers={MARKERS} listLabel="Where we work" />
      </Section>
    </>
  )
}

// Footers go last on the page, below every email field, the way a real page has them.
export function ContentFooters() {
  return (
    <>
      <Section id="marketing/site-footer" title="Site footer">
        <SiteFooter
          brand="Wordmark"
          tagline="Checks for pages that read as generated, with the fix for each finding."
          columns={[
            { title: 'Product', links: [{ label: 'Checks', href: '#checks' }, { label: 'Reports', href: '#reports' }, { label: 'Pricing', href: '#pricing' }, { label: 'Changelog', href: '#changelog' }] },
            { title: 'Resources', links: [{ label: 'Docs', href: '#docs' }, { label: 'Patterns', href: '#patterns' }, { label: 'Rules', href: '#rules' }] },
            { title: 'Company', links: [{ label: 'About', href: '#about' }, { label: 'Contact', href: '#contact' }, { label: 'Jobs', href: '#jobs' }] },
            { title: 'Legal', links: [{ label: 'Terms', href: '#terms' }, { label: 'Privacy', href: '#privacy' }, { label: 'Security', href: '#security' }] },
          ]}
          business={['Company name, registration number', 'Street address, city, postal code', 'hello@example.com']}
          copyright="2026 Company name"
          legal={[{ label: 'Terms', href: '#terms' }, { label: 'Privacy', href: '#privacy' }]}
        />
      </Section>

      <Section id="marketing/slim-footer" title="Slim footer">
        <SlimFooter
          copyright="2026 Company name"
          meta="Version 0.1.0"
          links={[{ label: 'Terms', href: '#terms' }, { label: 'Privacy', href: '#privacy' }, { label: 'Contact', href: '#contact' }]}
        />
      </Section>
    </>
  )
}
