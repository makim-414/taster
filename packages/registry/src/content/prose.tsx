import * as React from 'react'
import { cn } from '../blocks/_cn'
import { useStyleOnce } from '../motion/_motion'

// Prose: a reading column that sets plain HTML (Markdown output, CMS rich text) with a comfortable measure,
// a long-form line height, headings with more space above than below, quiet quotes, lists, inline code,
// code blocks, tables and figures. Wrap any rendered HTML in it; no class names are needed inside.
// Follows patterns/long-form-prose and patterns/korean-type-setup: 65ch for Latin, about 36 full-width
// characters for Korean (lang="ko"), line height 1.7 and 1.8 for Korean, never justified, words kept whole,
// blockquotes indented instead of given a colored side bar (AC-10). Everything reads tokens, so the
// density axis (--lh-normal) and the type scale reshape it.
// Original code, MIT.

const CSS = `
.dsg-prose{max-width:65ch;color:var(--text);font-size:var(--t-title);line-height:calc(var(--lh-normal) + 0.2);word-break:keep-all;overflow-wrap:break-word;text-align:start}
.dsg-prose:lang(ko){max-width:36em;line-height:calc(var(--lh-normal) + 0.3)}
.dsg-prose>*+*{margin-top:1.15em}
.dsg-prose h2{font-size:var(--t-h2);font-weight:var(--w-semi);line-height:var(--lh-snug);margin-top:2em;margin-bottom:0;text-wrap:balance}
.dsg-prose h3{font-size:calc(var(--t-title) + 2px);font-weight:var(--w-semi);line-height:var(--lh-snug);margin-top:1.75em;text-wrap:balance}
.dsg-prose h2+*,.dsg-prose h3+*{margin-top:0.6em}
.dsg-prose p,.dsg-prose li{text-wrap:pretty}
.dsg-prose a{color:var(--text);text-decoration:underline;text-underline-offset:0.2em;text-decoration-thickness:1px;border-radius:var(--r-sm)}
.dsg-prose a:hover{color:var(--text-muted)}
.dsg-prose a:focus-visible{outline:2px solid var(--ring);outline-offset:2px}
.dsg-prose strong{font-weight:var(--w-semi)}
.dsg-prose ul,.dsg-prose ol{padding-left:1.4em}
.dsg-prose ul{list-style:disc}
.dsg-prose ol{list-style:decimal}
.dsg-prose li+li{margin-top:0.5em}
.dsg-prose li::marker{color:var(--text-subtle)}
.dsg-prose blockquote{margin-left:0;padding-left:1.5em;color:var(--text-muted)}
.dsg-prose hr{border:0;border-top:1px solid var(--border);margin:2.5em 0}
.dsg-prose code{font-size:0.9em;background:var(--bg-sunken);border-radius:var(--r-sm);padding:0.1em 0.35em}
.dsg-prose pre{font-size:var(--t-sm);line-height:var(--lh-normal);background:var(--bg-sunken);border-radius:var(--r-md);padding:var(--sp-4);overflow-x:auto;word-break:normal}
.dsg-prose pre code{background:none;padding:0;font-size:inherit}
.dsg-prose figure{margin:2em 0}
.dsg-prose img{display:block;max-width:100%;height:auto;border-radius:var(--r-md)}
.dsg-prose figcaption{margin-top:var(--sp-2);font-size:var(--t-sm);color:var(--text-subtle)}
.dsg-prose table{width:100%;border-collapse:collapse;font-size:var(--t-body);font-variant-numeric:tabular-nums}
.dsg-prose th{text-align:left;font-weight:var(--w-med);color:var(--text-muted);border-bottom:1px solid var(--border);padding:var(--sp-2) var(--sp-3) var(--sp-2) 0}
.dsg-prose td{border-bottom:1px solid var(--border-soft);padding:var(--sp-2) var(--sp-3) var(--sp-2) 0;vertical-align:top}
`

export interface ProseProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Rendered HTML as a string, for Markdown or CMS output. It is set as markup with no cleaning, so pass only HTML you
   * trust. Anything a user or another site wrote goes through a sanitizer such as DOMPurify first, or markup in it
   * (an onerror handler, say) runs script on your page. For text you do not trust and do not need as HTML, pass it as children instead.
   * @example
   * import DOMPurify from 'dompurify'
   * <Prose html={DOMPurify.sanitize(markdownToHtml(post.body))} />
   */
  html?: string
}

export const Prose = React.forwardRef<HTMLDivElement, ProseProps>(function Prose({ html, className, children, ...props }, ref) {
  useStyleOnce('dsg-prose-css', CSS)
  if (html !== undefined) {
    return <div ref={ref} className={cn('dsg-prose', className)} dangerouslySetInnerHTML={{ __html: html }} {...props} />
  }
  return (
    <div ref={ref} className={cn('dsg-prose', className)} {...props}>
      {children}
    </div>
  )
})
