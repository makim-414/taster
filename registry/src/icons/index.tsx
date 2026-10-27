import * as React from 'react'

// Line icons used by the registry components. 24px grid, round caps, currentColor only.
// Only the glyphs the components actually use are included here.
// Add more by dropping another entry into `paths`, drawn on the same grid and stroke, or swap in your own icon set.
// Before adding an icon to a screen, find its slot in patterns/icon-placement.md: most feature cards need none.

const paths = {
  'search': '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',
  'chart-line': '<path d="M4 20h16"/><path d="M5 16l4-4 3 2 3.5-8.5"/>',
  'chart-bar': '<path d="M4 20h16"/><path d="M7 20v-6"/><path d="M12 20v-10"/><path d="M17 20v-4"/>',
  'list': '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h1.5M4 12h1.5M4 18h1.5"/>',
  'check': '<path d="M5 13l4 4 10-10"/>',
  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  'close': '<path d="M6 6l12 12M18 6 6 18"/>',
  'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'download': '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
  'file': '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/>',
} as const

export type IconName = keyof typeof paths

/** The three sizes of the set. Numbers are allowed for one-off layouts but should be rare. */
export type IconSize = 'sm' | 'md' | 'lg' | number

const SIZE_VAR: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'var(--icon-sm, 16px)',
  md: 'var(--icon-md, 20px)',
  lg: 'var(--icon-lg, 24px)',
}

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** sm 16px beside body text, md 20px in buttons and nav, lg 24px for category entries. Default md. */
  size?: IconSize
  /** Stroke width on the 24 grid. Default --icon-stroke (2). Keep one value for the whole page. */
  strokeWidth?: number
  /** Accessible label. When omitted the icon is decorative (aria-hidden). */
  title?: string
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = 'md', strokeWidth, title, style, width, height, ...rest },
  ref,
) {
  const box = typeof size === 'number' ? `${size}px` : SIZE_VAR[size]
  // Explicit width and height attributes still win, so older call sites keep their size.
  const px = (v: number | string | undefined) => (v === undefined ? undefined : typeof v === 'number' ? `${v}px` : v)
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      data-icon={name}
      {...rest}
      style={{
        width: px(width) ?? box,
        height: px(height) ?? box,
        flex: 'none',
        strokeWidth: strokeWidth ?? 'var(--icon-stroke, 2)',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + paths[name] }}
    />
  )
})

export interface IconLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: IconName
  size?: IconSize
  /** Put the icon after the label, for example an external link arrow. */
  trailing?: boolean
}

/**
 * An icon beside its label, centered on the first line of the label rather than on the whole block,
 * so a label that wraps keeps the icon on line one.
 */
export function IconLabel({ icon, size = 'sm', trailing = false, children, className, style, ...rest }: IconLabelProps) {
  const glyph = (
    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', height: '1lh', flex: 'none' }}>
      <Icon name={icon} size={size} />
    </span>
  )
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 'var(--sp-2, 8px)', ...style }}
      {...rest}
    >
      {trailing ? null : glyph}
      <span>{children}</span>
      {trailing ? glyph : null}
    </span>
  )
}
