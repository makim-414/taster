# Taster web

Paste a URL, see which slop rules it hits. The page links from the series ("put your site in here").
Live at https://taster-six.vercel.app (no custom domain for now; set `NEXT_PUBLIC_SITE_URL` when one is added).

- `app/page.tsx`, `app/diagnose.tsx`: one address field, then the result: rules hit with id, name and count
  per width, the 1440 and 390 captures with findings outlined, the fix patterns per rule, and the install line.
- `app/api/diagnose/route.ts`: POST `{ url }`. Runs `engine/diagnose.mjs` (`detectOnce`, `summarize`, which run
  `rules/detect.js`) in a server Chromium (`@sparticuz/chromium` on Vercel, local Chrome otherwise). There is no
  second detector here.

- `app/tone/`: the tone map. A pad on commerce to brand personality and minimal to expressive, a genre filter, the
  four nearest reference sites, and three registry parts running in the tokens of the spot (`engine/tone.mjs`, the
  same rules as the `pick_tone` tool). The address carries the spot, so an agent can hand over a link.
- `app/api/tone-shot/route.ts`: POST `{ ids }`, up to four ids from `taxonomy/tone-refs.json`, never a typed
  address. Opens each first screen through the same fence (`lib/tone-shot.ts` with `engine/tone-capture.mjs`):
  cookie banners are only rejected, a banner without a reject button comes back as `consent` and a bot check or
  block page as `blocked`, both with no picture. Pictures are never written to disk and are kept in server memory up
  to 30 minutes. 20 calls per IP per 10 minutes, and a ceiling per minute across all visitors.

## Safety

- Only http and https on ports 80, 443, 8080 and 8443. No credentials in the URL.
- Every request the page makes (document, redirects, subresources) is paused through the CDP Fetch domain and
  fetched by the server, after resolving the name and refusing it if any address is not public unicast
  (loopback, private, link local and the 169.254.169.254 metadata address, CGNAT, ULA, multicast, IPv4 mapped
  forms and so on). The socket connects to the address that was checked, so DNS rebinding has no window.
  Each redirect hop is checked again.
- The browser is pointed at a dead proxy, so anything that is not intercepted (WebSocket, WebRTC, workers,
  cross-origin frames) fails instead of reaching the network. Only GET and HEAD leave the server.
- Per client (one IPv4 address or one IPv6 /64) on each instance: 6 diagnoses and brand reads per 10 minutes and 60
  MCP tool calls a minute. Across all clients on each instance: 12 diagnoses and brand reads and 300 MCP tool calls
  a minute (`lib/limits.ts`). A Vercel firewall rule ("diagnose rate limit per IP") answers 429 after 10 POSTs to
  `/api/diagnose` per IP per 10 minutes across all instances. `/api/diagnose`, `/api/brand` and `/api/mcp` send
  `retry-after` with their 429 and 503 answers.
- One Chromium per instance at a time and two waiting. The wait and the run share the route's time limit less 10 s
  (80 s of the 90 for a diagnosis): the run gets what the wait left, and a call that would start with too little is
  answered 503 at once instead of timing out.
- `/api/mcp` takes one JSON-RPC message per POST (a batch gets 400) and answers with an error instead of anything
  over 4 MB.
- Page load 15 s per width (plus the engine's own load and idle waits), 400 requests and 60 MB per run.

## Link preview, crawlers and headers

Each page sets its own title, description, canonical address and Open Graph and Twitter card tags through
`lib/page-meta.ts`; `app/layout.tsx` holds only the defaults. The image is `public/og.png`, rendered from
`scripts/og/card.html` with the registry tokens by `node scripts/og/render.mjs`, which also writes the rule counts it
drew to `scripts/og/meta.json`. Re-render it when the copy, the address or the rules change: `npm --prefix web test`
fails while the counts are stale. `app/robots.ts` keeps crawlers off `/api/` and `/board`, `app/sitemap.ts` lists the
pages and every component, and `app/not-found.tsx` is the 404 screen.

`next.config.mjs` sends a content security policy (everything from this site, data: pictures, no framing except the
stage by this site) and a permissions policy on every response. The bookmarklet's files under `/taster/` are open to
every origin; a folder named after their hash is cached for good, the old `/taster/*.js` for five minutes.
`node scripts/check-metadata.mjs` checks all of it on a running build.

## Commands

```bash
npm ci --prefix web
npm ci --prefix engine --omit=dev --ignore-scripts
npm --prefix web run dev          # http://localhost:3240
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web test             # guard, limits, fenced engine on rules/fixtures
npm --prefix web run self-check   # detect.js on this app at 1440 and 390, must be 0
node web/scripts/check-metadata.mjs   # head tags, 404, robots, sitemap, headers, no policy violation (with the server up)
```

The fixture tests serve `rules/fixtures` on loopback and pass a test-only `allowLoopback` argument; no request
path sets it, and private ranges stay blocked even then.

## Deploy

Vercel project with root directory `web`, deployed from Git only. `vercel.json` turns off every branch except
`main`, so there are no preview builds. The build copies `rules/fixtures/{slop,clean,slop-ko}.html` to
`/fixtures/` so the live site can be checked against a known slop page and a known clean page.
