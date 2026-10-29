import * as React from 'react'
import { cn } from './_cn'
import { Icon } from '../icons'
import { Button } from './button'

// Session list: where the account is signed in. Each row is a device, its place and last activity,
// and a sign-out button; the current device says so in words and has no button.
// Written for this registry after a 21st.dev session list the owner picked. The original's tiny
// forced-caps mono labels ("REVOKE", an 8px pill) and accent tinted border were the slop parts
// (AC-09, the type rules), so the rows were drawn again with the registry list row and button.

export interface Session {
  id: string
  /** Browser and system, e.g. "Chrome on macOS". */
  device: string
  location: string
  /** Already formatted, e.g. "2 hours ago". */
  lastActive: string
  current?: boolean
  kind?: 'desktop' | 'mobile' | 'tablet'
}

export interface SessionListProps extends React.HTMLAttributes<HTMLDivElement> {
  sessions: Session[]
  /** Called after a row is signed out. The row leaves the list at once. */
  onRevoke?: (id: string) => void
  /** Label of the current device. Default "This device". */
  currentLabel?: string
  /** Text of the sign-out button. Default "Sign out". */
  revokeLabel?: string
}

const ICON = { desktop: 'monitor', mobile: 'phone', tablet: 'tablet' } as const

export function SessionList({
  sessions,
  onRevoke,
  currentLabel = 'This device',
  revokeLabel = 'Sign out',
  className,
  ...props
}: SessionListProps) {
  const [revoked, setRevoked] = React.useState<string[]>([])
  const visible = sessions.filter((s) => !revoked.includes(s.id))
  const others = visible.filter((s) => !s.current).length

  return (
    <div className={cn('w-full max-w-md', className)} {...props}>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {visible.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-bg-elev text-text-muted">
              <Icon name={ICON[s.kind ?? 'desktop']} size="sm" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text">{s.device}</div>
              <p className="truncate text-caption text-text-muted">
                {s.current ? `${currentLabel} · ${s.location}` : `${s.location} · ${s.lastActive}`}
              </p>
            </div>
            {!s.current && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${revokeLabel}: ${s.device}, ${s.location}`}
                onClick={() => {
                  setRevoked((r) => [...r, s.id])
                  onRevoke?.(s.id)
                }}
              >
                {revokeLabel}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {others === 0 && revoked.length > 0 && (
        <p role="status" className="mt-2 text-sm text-text-muted">
          Signed out everywhere else.
        </p>
      )}
    </div>
  )
}
