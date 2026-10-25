---
id: month-calendar
name: Month calendar
category: timeline-stepper
uses: [show-when-things-happen, enter-data]
surfaces: [app]
replaces: []
components: [blocks/calendar, blocks/datepicker]
inspiration: [https://ui.shadcn.com/docs/components/calendar, https://daypicker.dev]
status: stable
---

## When to use

Two jobs, one grid. Use the date picker popover when a form needs a date or a range. Use the full month grid when people need to see load across days: bookings, deadlines, publishing schedules. If the data is a handful of dates, a dated list is faster to read than a grid that is mostly empty.

## Anatomy

- Header: month and year, previous and next buttons, a "Today" button. Month name uses the page locale.
- Weekday row in `--text-subtle`, week start follows the locale (Monday in most of Europe, Sunday in the US, Sunday or Monday in Korea depending on the product).
- Day cells: 32 to 36px square in the picker, flexible in the full grid. Today is bold with `--text`; selected is a filled `--accent` square with `--accent-fg` text.
- Days outside the month are shown at half opacity, still clickable.
- Six rows always. Months that need only five weeks keep a blank sixth row so the grid does not jump when you page.
- Event chips in the full grid: one line of text on `--bg-elev` with a 1px `--border`, max three per cell and a "+2 more" link.
- Picker trigger: an input-height button with a calendar icon and the formatted date, opening a `Popover`.

## Do

- Accept typed input in the picker as well as clicks. Many people know the date already.
- Format dates with `toLocaleDateString` and the page locale, never a hard-coded `MM/DD/YYYY`.
- Disable impossible days (past, booked) and explain once, in a caption, why they are dimmed.
- Make arrow keys move by day, page up and down by month, as the underlying `react-day-picker` does.
- Keep the selected day and today distinguishable without color: fill versus bold.

## Don't

- Don't color-code event chips by category with a different hue each. Use one neutral chip and a short text prefix.
- Don't put a drop shadow on the selected day.
- Don't open a full-screen modal calendar for a single birthday field.
- Don't let the grid change height between months.
- Don't show a week-number column unless the product uses week numbers.

## Swap recipe

No catalog rule covers this yet. The usual slop is a native date input styled with a gradient, or a calendar whose events are rainbow-tinted blocks.

```tsx
// before
<div className="grid grid-cols-7 gap-1">
  {days.map((d) => (
    <div key={d} className={`rounded-xl p-2 ${d.event ? 'bg-gradient-to-br from-fuchsia-500 to-indigo-500 shadow-lg shadow-fuchsia-500/40' : ''}`}>
      {d.n}
    </div>
  ))}
</div>

// after: a date field in a form
import { DatePicker } from './blocks/datepicker'

<label className="block text-sm text-text-muted">
  Delivery date
  <DatePicker value={date} onValueChange={setDate} placeholder="Pick a date" className="mt-1 w-full" />
</label>

// after: month grid with neutral chips
import { Calendar } from './blocks/calendar'

<Calendar mode="single" selected={day} onSelect={setDay} showOutsideDays fixedWeeks />
```

`fixedWeeks` is the prop that keeps six rows. The selected-day fill, today bold and outside-day opacity come from the `.rdp-*` variables in `base.css`, which read the tokens below.

## Tokens

- `--accent`, `--accent-fg`: selected day.
- `--bg-elev`, `--border`: hover fill, event chips, popover edge.
- `--popover`: popover surface.
- `--text`, `--text-muted`, `--text-subtle`: today, normal days, weekday row and outside days.
- `--r-md`, `--r-card`: day cell and popover corners.
- `--sh-pop`: the popover shadow, the only shadow here.
