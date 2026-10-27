import * as React from 'react'
import { cn } from './_cn'

// Bar chart. Responsive inline SVG, no chart library.
// Bars use the neutral lightness ramp (chart tokens) by value rank, never a rainbow.

export interface BarDatum {
  label: string
  value: number
}

export interface BarChartProps extends Omit<React.SVGAttributes<SVGSVGElement>, 'height'> {
  data: BarDatum[]
  height?: number
}

const RAMP = ['fill-chart-2', 'fill-chart-3', 'fill-chart-4', 'fill-chart-5']

function rankFill(value: number, sorted: number[]): string {
  if (sorted.length < 4) return 'fill-chart-3'
  const rank = sorted.indexOf(value)
  const step = Math.floor((rank / Math.max(sorted.length - 1, 1)) * (RAMP.length - 1))
  return RAMP[Math.min(step, RAMP.length - 1)]
}

export const BarChart = React.forwardRef<SVGSVGElement, BarChartProps>(
  ({ data, height = 160, className, ...props }, ref) => {
    // Measure the real width so the viewBox is 1:1 with pixels and the labels never stretch.
    const innerRef = React.useRef<SVGSVGElement | null>(null)
    const [VBW, setVBW] = React.useState(320)
    React.useLayoutEffect(() => {
      const el = innerRef.current
      if (!el) return
      const measure = () => setVBW(Math.max(el.clientWidth, 1))
      measure()
      if (typeof ResizeObserver === 'undefined') return
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      return () => ro.disconnect()
    }, [])
    const setRef = (node: SVGSVGElement | null) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<SVGSVGElement | null>).current = node
    }
    const labelBand = 22
    const topPad = 8
    const plotH = height - labelBand - topPad
    const baselineY = topPad + plotH
    const max = Math.max(...data.map((d) => d.value), 1)
    const sorted = [...data.map((d) => d.value)].sort((a, b) => b - a)

    const slot = VBW / Math.max(data.length, 1)
    const barW = slot * 0.56
    const gap = (slot - barW) / 2

    return (
      <svg
        ref={setRef}
        viewBox={`0 0 ${VBW} ${height}`}
        width="100%"
        height={height}
        role="img"
        className={cn('block text-text-subtle', className)}
        {...props}
      >
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * plotH, 1)
          const x = i * slot + gap
          const y = baselineY - h
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
              className={rankFill(d.value, sorted)}
            />
          )
        })}

        <line
          x1={0}
          y1={baselineY}
          x2={VBW}
          y2={baselineY}
          stroke="currentColor"
          strokeWidth={1}
          className="text-border"
        />

        {data.map((d, i) => {
          const cx = i * slot + slot / 2
          return (
            <text
              key={i}
              x={cx}
              y={height - 6}
              textAnchor="middle"
              className="fill-current text-micro text-text-subtle"
            >
              {d.label}
            </text>
          )
        })}
      </svg>
    )
  },
)
BarChart.displayName = 'BarChart'
