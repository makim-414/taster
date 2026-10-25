import * as React from 'react'
import {
  ResponsiveContainer,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Cell,
} from 'recharts'
import { cn } from './_cn'

// Compare chart. Category bars via recharts, with tooltip and grid.
// Bar color follows value rank on the neutral lightness ramp.

export interface CompareDatum {
  label: string
  value: number
}

export interface CompareChartProps {
  data: CompareDatum[]
  height?: number
  className?: string
}

const RAMP = ['var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

function rampColor(value: number, sorted: number[]): string {
  if (sorted.length < 4) return 'var(--chart-3)'
  const rank = sorted.indexOf(value)
  const step = Math.floor((rank / Math.max(sorted.length - 1, 1)) * (RAMP.length - 1))
  return RAMP[Math.min(step, RAMP.length - 1)]
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-md border border-border bg-bg-popover px-2.5 py-1.5 shadow-lg">
      <div className="text-micro text-text-subtle">{label}</div>
      <div className="text-sm font-medium tabular-nums text-text">{payload[0].value}</div>
    </div>
  )
}

export function CompareChart({ data, height = 180, className }: CompareChartProps) {
  const sorted = [...data.map((d) => d.value)].sort((a, b) => b - a)
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-subtle)', fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--text-subtle)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <RTooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-elev)' }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={rampColor(d.value, sorted)} />
            ))}
          </Bar>
        </RBarChart>
      </ResponsiveContainer>
    </div>
  )
}
