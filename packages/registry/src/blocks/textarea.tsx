'use client'

import * as React from 'react'
import { cn } from './_cn'

// Textarea with the same field chrome as Input. Optional auto resize between minRows and maxRows, and a
// character count when maxLength is set. The count is linked with aria-describedby and turns to full ink near the
// limit, so the cue is not color alone.

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean
  minRows?: number
  maxRows?: number
  /** Show "used / max" under the field. Needs maxLength. */
  showCount?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { autoResize = false, minRows = 3, maxRows = 10, showCount = false, className, maxLength, value, defaultValue, onChange, ...props },
    forwarded,
  ) => {
    const inner = React.useRef<HTMLTextAreaElement | null>(null)
    const reactId = React.useId()
    const countId = `${props.id ?? reactId}-count`
    const [length, setLength] = React.useState(() => String(value ?? defaultValue ?? '').length)

    const setRef = (el: HTMLTextAreaElement | null) => {
      inner.current = el
      if (typeof forwarded === 'function') forwarded(el)
      else if (forwarded) forwarded.current = el
    }

    const resize = React.useCallback(() => {
      const el = inner.current
      if (!el || !autoResize) return
      const cs = getComputedStyle(el)
      const line = parseFloat(cs.lineHeight) || 20
      const chrome = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
      el.style.height = 'auto'
      const h = Math.min(Math.max(el.scrollHeight, line * minRows + chrome), line * maxRows + chrome)
      el.style.height = `${h}px`
      el.style.overflowY = el.scrollHeight > h ? 'auto' : 'hidden'
    }, [autoResize, minRows, maxRows])

    React.useLayoutEffect(() => {
      if (value !== undefined) setLength(String(value).length)
      resize()
    }, [value, resize])

    const showCounter = showCount && typeof maxLength === 'number'
    const near = showCounter && length >= (maxLength as number) * 0.9
    const describedBy = [props['aria-describedby'], showCounter ? countId : null].filter(Boolean).join(' ') || undefined

    return (
      <div className="flex w-full flex-col gap-1">
        <textarea
          ref={setRef}
          rows={minRows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => {
            setLength(e.target.value.length)
            onChange?.(e)
            resize()
          }}
          className={cn(
            'w-full rounded-md border border-border-input bg-transparent px-3 py-2 text-sm leading-normal text-text',
            'placeholder:text-text-subtle outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-50',
            autoResize ? 'resize-none' : 'resize-y',
            className,
          )}
          {...props}
          aria-describedby={describedBy}
        />
        {showCounter && (
          <div id={countId} className={cn('self-end text-label tabular-nums', near ? 'font-medium text-text' : 'text-text-subtle')}>
            {length} / {maxLength}
          </div>
        )}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
