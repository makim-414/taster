import * as React from 'react'
import {
  ResponsiveContainer,
  AreaChart as RAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts'
import { cn } from './_cn'

// Trend chart. Time series area via recharts, with tooltip and axes.
// Fill is a lightness gradient from the chart tokens, grid uses the soft border token.

export interface TrendDatum {
  label: string
  value: number
}

export interface TrendChartProps {
  data: TrendDatum[]
  height?: number
  area?: boolean
  className?: string
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

export function TrendChart({ data, height = 180, area = true, className }: TrendChartProps) {
  const gid = React.useId().replace(/:/g, '')
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RAreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`trend-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={area ? 0.28 : 0} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <RTooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)' }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fill={`url(#trend-${gid})`}
            dot={false}
            activeDot={{ r: 3, fill: 'var(--text)', stroke: 'var(--bg)', strokeWidth: 2 }}
          />
        </RAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
