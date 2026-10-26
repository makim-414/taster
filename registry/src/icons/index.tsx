import * as React from 'react'

// Line icons used by the registry components. 24px grid, round caps, currentColor only.
// Only the glyphs the components actually use are included here.
// Add more by dropping another entry into `paths`, or swap in your own icon set.

const paths = {
  'search': '<circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/>',
  'chart-line': '<path d="M4 20h16"/><path d="M5 16l4-4 3 2 3.5-8.5"/>',
  'chart-bar': '<path d="M4 20h16"/><path d="M7 20v-6"/><path d="M12 20v-10"/><path d="M17 20v-4"/>',
  'list': '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h1.5M4 12h1.5M4 18h1.5"/>',
  'check': '<path d="M5 13l4 4 10-10"/>',
  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
} as const

export type IconName = keyof typeof paths

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Square pixel size. Default 20. */
  size?: number
  /** Stroke width. Default 2. */
  strokeWidth?: number
  /** Accessible label. When omitted the icon is decorative (aria-hidden). */
  title?: string
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
  { name, size = 20, strokeWidth = 2, title, ...rest },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + paths[name] }}
    />
  )
})
