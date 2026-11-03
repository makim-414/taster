import * as React from 'react'
import { cn } from '../blocks/_cn'

// Message composer: the box under a chat thread. A textarea that grows from one line to about eight and
// then scrolls, an attach button and drag and drop for files, the attached files as removable chips, and
// one button on the right that is Send when idle and Stop while a reply streams, in the same place and the
// same size so the target never moves. Enter sends, Shift+Enter makes a new line, and Enter while an
// input method is composing (Korean, Japanese, Chinese) finishes the syllable instead of sending.
// The draft is kept by the caller when `value` and `onValueChange` are passed, or kept here otherwise.
// Follows patterns/agent-chat-thread: a plain rounded box with a hairline, not a floating glass bar
// (CMP-05), and no auto-send on a pause in typing.
// Original code, MIT.

export interface ComposerFile {
  id: string
  file: File
}

export interface MessageComposerProps extends Omit<React.HTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  onSend: (message: { text: string; files: File[] }) => void
  /** True while a reply streams: the send button becomes Stop. */
  streaming?: boolean
  onStop?: () => void
  value?: string
  onValueChange?: (v: string) => void
  placeholder?: string
  label?: string
  /** File input accept string, for example "image/*,.pdf". Leave out to hide the attach button. */
  accept?: string
  maxFiles?: number
  /** One line under the box, for example a model name or a usage note. */
  hint?: React.ReactNode
  disabled?: boolean
}

const ROUND_BTN =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill outline-none transition-[opacity,colors,transform] duration-press ease-out ' +
  'focus-visible:ring-2 focus-visible:ring-ring active:scale-press disabled:pointer-events-none disabled:opacity-40 desk:h-9 desk:w-9'

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export function MessageComposer({
  onSend,
  streaming = false,
  onStop,
  value,
  onValueChange,
  placeholder = 'Ask a question or describe a task',
  label = 'Message',
  accept,
  maxFiles = 5,
  hint,
  disabled = false,
  className,
  ...props
}: MessageComposerProps) {
  const [own, setOwn] = React.useState('')
  const text = value ?? own
  const setText = (v: string) => (onValueChange ? onValueChange(v) : setOwn(v))
  const [files, setFiles] = React.useState<ComposerFile[]>([])
  const [drag, setDrag] = React.useState(false)
  const area = React.useRef<HTMLTextAreaElement>(null)
  const picker = React.useRef<HTMLInputElement>(null)
  const uid = React.useId()

  // Grow with the content up to eight lines.
  React.useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    const line = parseFloat(getComputedStyle(el).lineHeight) || 21
    el.style.height = `${Math.min(el.scrollHeight, line * 8 + 16)}px`
  }, [text])

  function addFiles(list: FileList | null) {
    if (!list) return
    const next = Array.from(list).map((file, i) => ({ id: `${Date.now()}-${i}-${file.name}`, file }))
    setFiles((f) => [...f, ...next].slice(0, maxFiles))
  }

  function send() {
    if (streaming || disabled) return
    const t = text.trim()
    if (!t && !files.length) return
    onSend({ text: t, files: files.map((f) => f.file) })
    setText('')
    setFiles([])
    area.current?.focus()
  }

  const canSend = !disabled && (text.trim().length > 0 || files.length > 0)

  return (
    <form
      className={cn('min-w-0', className)}
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
      onDragOver={(e) => {
        if (!accept) return
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (!accept) return
        e.preventDefault()
        setDrag(false)
        addFiles(e.dataTransfer.files)
      }}
      {...props}
    >
      <div
        className={cn(
          'rounded-2xl border bg-bg px-2 pb-2 pt-1 transition-colors duration-press ease-out focus-within:border-text-subtle',
          drag ? 'border-text' : 'border-border',
        )}
      >
        {files.length ? (
          <ul aria-label="Attached files" className="m-0 flex list-none flex-wrap gap-2 p-0 px-1 pt-2">
            {files.map((f) => (
              <li key={f.id} className="inline-flex h-11 max-w-full items-center gap-2 rounded-md bg-bg-sunken pl-3 text-label text-text desk:h-9">
                <span className="min-w-0 max-w-[24ch] truncate">{f.file.name}</span>
                <span className="shrink-0 tabular-nums text-text-subtle">{fmtSize(f.file.size)}</span>
                <button
                  type="button"
                  onClick={() => setFiles((all) => all.filter((x) => x.id !== f.id))}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-ring desk:h-9 desk:w-9"
                >
                  <span className="sr-only">Remove {f.file.name}</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label htmlFor={`${uid}-text`} className="sr-only">
          {label}
        </label>
        <textarea
          ref={area}
          id={`${uid}-text`}
          rows={1}
          value={text}
          disabled={disabled}
          placeholder={placeholder}
          aria-describedby={hint ? `${uid}-hint` : undefined}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              send()
            }
          }}
          onPaste={(e) => {
            if (accept && e.clipboardData.files.length) addFiles(e.clipboardData.files)
          }}
          className="block max-h-[calc(var(--lh-normal)*8em+16px)] min-h-11 w-full resize-none bg-transparent px-2 py-2 text-body leading-[var(--lh-normal)] text-text outline-none [word-break:keep-all] placeholder:text-text-subtle"
        />
        <div className="flex items-center justify-between gap-2">
          {accept ? (
            <>
              <input ref={picker} type="file" multiple accept={accept} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => addFiles(e.target.files)} />
              <button
                type="button"
                onClick={() => picker.current?.click()}
                disabled={disabled || files.length >= maxFiles}
                className={cn(ROUND_BTN, 'text-text-muted hover:bg-bg-sunken hover:text-text')}
              >
                <span className="sr-only">Attach files</span>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m20 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
                </svg>
              </button>
            </>
          ) : (
            <span />
          )}
          {streaming ? (
            <button type="button" onClick={onStop} className={cn(ROUND_BTN, 'bg-text text-bg hover:opacity-90')}>
              <span className="sr-only">Stop the reply</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
                <rect x="6" y="6" width="12" height="12" rx="1.5" />
              </svg>
            </button>
          ) : (
            <button type="submit" disabled={!canSend} className={cn(ROUND_BTN, 'bg-accent text-accent-fg hover:opacity-90')}>
              <span className="sr-only">Send</span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 19V5" />
                <path d="m6 11 6-6 6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {hint ? (
        <p id={`${uid}-hint`} className="mt-2 px-1 text-label text-text-subtle">
          {hint}
        </p>
      ) : null}
    </form>
  )
}
