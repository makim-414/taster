# Taster web

Paste a URL, see which slop rules it hits. The page links from the series ("put your site in here").
Live at https://taster-six.vercel.app (no custom domain for now; set `NEXT_PUBLIC_SITE_URL` when one is added).

- `app/page.tsx`, `app/diagnose.tsx`: one address field, then the result: rules hit with id, name and count
  per width, the 1440 and 390 captures with findings outlined, the fix patterns per rule, and the install line.
- `app/api/diagnose/route.ts`: POST `{ url }`. Runs `engine/diagnose.mjs` (`detectOnce`, `summarize`, which run
  `rules/detect.js`) in a server Chromium (`@sparticuz/chromium` on Vercel, local Chrome otherwise). There is no
  second detector here.

## Safety

- Only http and https on ports 80, 443, 8080 and 8443. No credentials in the URL.
- Every request the page makes (document, redirects, subresources) is paused through the CDP Fetch domain and
  fetched by the server, after resolving the name and refusing it if any address is not public unicast
  (loopback, private, link local and the 169.254.169.254 metadata address, CGNAT, ULA, multicast, IPv4 mapped
  forms and so on). The socket connects to the address that was checked, so DNS rebinding has no window.
  Each redirect hop is checked again.
- The browser is pointed at a dead proxy, so anything that is not intercepted (WebSocket, WebRTC, workers,
  cross-origin frames) fails instead of reaching the network. Only GET and HEAD leave the server.
- Per IP: 6 diagnoses per 10 minutes per instance. One Chromium per instance at a time, a short queue, then 503.
- Page load 15 s per width (plus the engine's own load and idle waits), 80 s for the whole run, 400 requests and
  60 MB per run.

## Link preview

`app/layout.tsx` sets Open Graph and Twitter card tags; the image is `public/og.png`, rendered from
`scripts/og/card.html` with the registry tokens by `node scripts/og/render.mjs`. Re-render it when the copy or the
address changes.

## Commands

```bash
npm ci --prefix web
npm ci --prefix engine --omit=dev --ignore-scripts
npm --prefix web run dev          # http://localhost:3240
npm --prefix web run typecheck
npm --prefix web run build
npm --prefix web test             # guard, limits, fenced engine on rules/fixtures
npm --prefix web run self-check   # detect.js on this app at 1440 and 390, must be 0
```

The fixture tests serve `rules/fixtures` on loopback and pass a test-only `allowLoopback` argument; no request
path sets it, and private ranges stay blocked even then.

## Deploy

Vercel project with root directory `web`, deployed from Git only. `vercel.json` turns off every branch except
`main`, so there are no preview builds. The build copies `rules/fixtures/{slop,clean,slop-ko}.html` to
`/fixtures/` so the live site can be checked against a known slop page and a known clean page.
