import * as React from 'react'
import { cn } from '../blocks/_cn'

// Chat thread: the scrolling log of a conversation with an assistant. The person's messages sit in a
// raised bubble on the right, at most about 80 percent wide; the assistant's replies are plain text on the
// page surface at a reading measure, with no bubble and no avatar on every turn. The speaker's name shows
// only when the speaker changes. Tool calls, approvals and cited answers go inline as message content.
// The log follows new content while the reader is at the bottom and stops the moment they scroll up; a
// "Jump to latest" button then appears. role="log" with aria-busy while a reply streams, so assistive tech
// hears finished messages, not every token. Each assistant reply has a Copy action on hover and on focus.
// Follows patterns/agent-chat-thread: no gradient bubble, no bounce on entry (MOT-01), no robot icon or
// sparkle emoji as the assistant mark (AC-03, ICO-01), mono only for code.
// Original code, MIT.

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: React.ReactNode
  /** Plain text of the message, used by Copy. */
  text?: string
  /** Formatted time, shown with the speaker name when the speaker changes. */
  time?: string
  /** Language of the message when it differs from the page, for example "ko". */
  lang?: string
}

export interface ChatThreadProps extends React.HTMLAttributes<HTMLDivElement> {
  messages: ChatMessage[]
  /** True while the last assistant message is still streaming. */
  streaming?: boolean
  names?: { user: string; assistant: string }
  label?: string
  jumpLabel?: string
}

const KEEP = 'break-keep [overflow-wrap:break-word]'

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = React.useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          window.setTimeout(() => setDone(false), 1400)
        } catch {
          /* clipboard not available: nothing to do, the text stays selectable */
        }
      }}
      className="inline-flex h-11 items-center gap-1.5 rounded-sm px-2 text-label text-text-muted opacity-100 outline-none transition-opacity duration-press ease-out hover:text-text focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring desk:h-8 desk:opacity-0 desk:group-hover:opacity-100 desk:group-focus-within:opacity-100"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {done ? <path d="M5 13l4 4 10-10" /> : <path d="M9 9h10v10H9zM5 15V5h10" />}
      </svg>
      <span aria-live="polite">{done ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

export function ChatThread({
  messages,
  streaming = false,
  names = { user: 'You', assistant: 'Assistant' },
  label = 'Conversation',
  jumpLabel = 'Jump to latest',
  className,
  ...props
}: ChatThreadProps) {
  const log = React.useRef<HTMLDivElement>(null)
  const pinned = React.useRef(true)
  const [showJump, setShowJump] = React.useState(false)
  const last = messages[messages.length - 1]
  // Follow the stream while pinned to the bottom.
  const signature = `${messages.length}:${last?.id}:${typeof last?.content === 'string' ? last.content.length : ''}:${last?.text?.length ?? ''}`

  React.useLayoutEffect(() => {
    const el = log.current
    if (!el) return
    if (pinned.current) el.scrollTop = el.scrollHeight
    else setShowJump(true)
  }, [signature])

  return (
    <div className={cn('relative flex min-h-0 flex-col', className)} {...props}>
      <div
        ref={log}
        role="log"
        aria-label={label}
        aria-busy={streaming || undefined}
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
          if (pinned.current) setShowJump(false)
        }}
        className="min-h-0 flex-1 overflow-y-auto rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ol className="m-0 grid list-none gap-6 p-0 py-2">
          {messages.map((m, i) => {
            const changed = i === 0 || messages[i - 1].role !== m.role
            const mine = m.role === 'user'
            return (
              <li key={m.id} lang={m.lang} className={cn('group flex min-w-0 flex-col', mine ? 'items-end' : 'items-start')}>
                {changed ? (
                  <p className="mb-1 text-label text-text-subtle">
                    <span className="font-medium text-text-muted">{mine ? names.user : names.assistant}</span>
                    {m.time ? <span className="tabular-nums"> {m.time}</span> : null}
                  </p>
                ) : (
                  <span className="sr-only">{mine ? names.user : names.assistant}</span>
                )}
                {mine ? (
                  <div className={cn('max-w-[80%] whitespace-pre-wrap rounded-2xl bg-bg-sunken px-4 py-2.5 text-body leading-[var(--lh-normal)] text-text', KEEP)}>
                    {m.content}
                  </div>
                ) : (
                  <div className={cn('w-full max-w-[68ch] text-body leading-[calc(var(--lh-normal)+0.1)] text-text', KEEP)}>{m.content}</div>
                )}
                {!mine && m.text && !(streaming && i === messages.length - 1) ? (
                  <div className="-ml-2 mt-1">
                    <CopyButton text={m.text} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ol>
      </div>
      {showJump ? (
        <button
          type="button"
          onClick={() => {
            const el = log.current
            if (!el) return
            el.scrollTop = el.scrollHeight
            pinned.current = true
            setShowJump(false)
          }}
          className="absolute bottom-3 left-1/2 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-pill border border-border bg-bg px-4 text-label font-medium text-text shadow-pop outline-none focus-visible:ring-2 focus-visible:ring-ring desk:h-9"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14" />
            <path d="m6 13 6 6 6-6" />
          </svg>
          {jumpLabel}
        </button>
      ) : null}
    </div>
  )
}
