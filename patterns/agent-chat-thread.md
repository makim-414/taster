---
id: agent-chat-thread
name: Agent chat thread and composer
category: chat-ai
uses: [ask-the-assistant]
surfaces: [ai-chat]
replaces: []
components: [blocks/input, blocks/button]
inspiration: []
status: stable
---

## When to use

Use it for any conversation with an agent that answers, uses tools and sometimes asks permission: a side panel in an app, a full page assistant, a support helper. The thread is a log that grows, the composer is the one place the person types.

Do not use it for a one-shot "ask a question, get an answer" box with no history. A single input and a result card is simpler. Do not use bubbles on both sides if the agent produces long, structured answers; plain text reads better.

## Anatomy

The thread is a scroll container with `role="log"` and `aria-live="polite"`. Rows alternate between two shapes:

- The person's messages: a bubble, right aligned or in a slightly raised surface, max width about 80 percent.
- The agent's replies: plain text on the page surface, full measure (about 68 characters), no bubble, no avatar chrome. Tool steps and approval cards sit inline between paragraphs.

Below the log, a "Jump to latest" button appears only when the person has scrolled up and new content arrived.

The composer is a rounded box with a textarea that grows from one line up to about eight, then scrolls. On the left, a plus menu for attachments. Typing `/` opens a menu of quick commands. On the right, one button that is Send when idle and Stop while streaming. Enter sends, Shift+Enter makes a new line.

## Do

- Follow the stream: keep the log pinned to the bottom while the user is at the bottom, and stop following the moment they scroll up.
- Put the Stop button where Send was, same size, so the target does not move.
- Keep the composer fixed to the bottom of its container with a hairline top border, not a floating glass bar.
- Show per-message actions (copy, retry) on hover and on focus. Keep them keyboard reachable.
- Announce new agent text to assistive tech by rendering finished chunks, not every token. Use `aria-busy` while streaming.
- Preserve the draft when the user navigates away.
- Show errors inline in the thread with a retry action, in plain words.

## Don't

- Do not put an avatar, a name and a timestamp on every message. Show them when the speaker changes.
- Do not use a bubble with a tail and a gradient fill for the agent (COL-01).
- Do not animate each message entering with a bounce (MOT-01).
- Do not use sparkle emoji or a robot icon as the agent mark (AC-03, ICO-01).
- Do not set the whole thread in a monospace font (AC-09). Use mono only for code and tool arguments.
- Do not auto-send on a pause in typing.

## Swap recipe

The slop version is a consumer messenger skin: gradient bubbles for both sides, avatars on every line, a sparkle icon, a glowing send button.

```html
<!-- before: bubbles both sides, gradient, glow -->
<div class="flex gap-3"><img class="h-8 w-8 rounded-full" src="bot.png" />
  <div class="rounded-2xl rounded-bl-none bg-gradient-to-r from-indigo-500 to-violet-500 p-4">Sure! I can help with that <svg class="sparkle-icon"></svg></div>
</div>
<button class="rounded-full bg-violet-500 shadow-[0_0_24px_#8b5cf6]">Send</button>
```

```tsx
// after: operator bubble, agent plain text, one growing composer
export function Thread({ messages }: { messages: Message[] }) {
  return (
    <div role="log" aria-live="polite" className="mx-auto flex max-w-[68ch] flex-col gap-[var(--sp-5)] py-[var(--sp-6)]">
      {messages.map((m) =>
        m.role === 'user' ? (
          <div key={m.id} className="ml-auto max-w-[80%] rounded-[var(--r-xl)] bg-[var(--bg-elev)] px-[var(--sp-4)] py-[var(--sp-3)]">{m.text}</div>
        ) : (
          <div key={m.id} className="text-[length:var(--t-body)] leading-[var(--lh-normal)]">{m.parts}</div>
        ),
      )}
    </div>
  )
}

export function Composer({ onSend, onStop, streaming }: ComposerProps) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const grow = () => { const el = ref.current!; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 192) + 'px' }
  return (
    <form className="flex items-end gap-[var(--sp-2)] rounded-[var(--r-2xl)] border border-[var(--border)] bg-[var(--bg-elev)] p-[var(--sp-2)]"
      onSubmit={(e) => { e.preventDefault(); streaming ? onStop() : onSend(ref.current!.value) }}>
      <textarea ref={ref} rows={1} onInput={grow} aria-label="Message"
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form!.requestSubmit() } }}
        className="max-h-48 flex-1 resize-none bg-transparent px-[var(--sp-3)] py-[var(--sp-2)] outline-none" />
      <Button type="submit" size="md">{streaming ? 'Stop' : 'Send'}</Button>
    </form>
  )
}
```

Gradient bubbles, the sparkle and the glow map to COL-01, AC-03 and COL-07. The fix removes all three and removes the second bubble.

## Tokens

- Operator bubble: `--bg-elev`, `--r-xl`. Agent text: `--text` on `--bg`, `--t-body`, `--lh-normal`.
- Composer: `--bg-elev`, `--border`, `--r-2xl`, inner padding `--sp-2`. Focus ring uses `--ring`.
- Gaps between turns `--sp-5`, between paragraphs inside a turn `--sp-3`.
- Code and tool arguments: `--font-mono` at `--t-sm` only.
- Motion: the jump button fades in over `--dur-tooltip`. Streaming text has no animation. Under reduced motion, the jump scrolls instantly.
