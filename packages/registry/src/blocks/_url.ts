// Link checks for URLs that arrive as props. React 18 writes a javascript: URL into href as given (React 19 blocks
// it), and a copied component cannot know where its URLs come from, so every href or form action taken from a prop
// goes through safeHref. Relative paths, #fragments and ?queries pass; absolute URLs pass only as http:, https: or
// mailto:. Anything else (javascript:, data:, vbscript:, an unknown scheme) comes back undefined, and the component
// draws its plain element instead of a link. An <a> left without href is a placeholder: not focusable, not a link.

const SCHEMES = ['http', 'https', 'mailto']

/** The URL, unchanged, when it is safe as an href or form action, otherwise undefined. Add a scheme to SCHEMES (tel, for example) if your links need it. */
export function safeHref(url: string | null | undefined): string | undefined {
  if (typeof url !== 'string') return undefined
  // Read the scheme the way a browser does: it drops leading and trailing control characters and spaces, and every
  // tab and newline, so " java\tscript:" is still javascript:.
  const clean = url.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '').replace(/[\t\n\r]/g, '')
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(clean)
  if (!scheme) return url
  return SCHEMES.includes(scheme[1].toLowerCase()) ? url : undefined
}

/** The 11 character video id of a YouTube watch or youtu.be URL over http or https, otherwise undefined. */
export function youtubeId(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return undefined
    const id =
      parsed.hostname === 'youtu.be'
        ? parsed.pathname.slice(1)
        : /(^|\.)youtube\.com$/.test(parsed.hostname)
          ? parsed.searchParams.get('v')
          : null
    return id && /^[\w-]{11}$/.test(id) ? id : undefined
  } catch {
    return undefined
  }
}
