# Taster web

The hosted Taster: paste a public URL and see which rules it hits on captures at desktop and phone width, browse the
components running live in your brand, compare them side by side on the board, place a look on the tone map, get the
bookmarklet, and connect an agent to the hosted MCP server. The pages are in Korean for now.
Live at https://taster-six.vercel.app (no custom domain for now; set `NEXT_PUBLIC_SITE_URL` when one is added).

- `app/page.tsx`, `app/diagnose.tsx`: one address field, then the result: rules hit with id, name and count
  per width, the 1440 and 390 captures with findings outlined, the fix patterns per rule, and the install line.
- `app/api/diagnose/route.ts`: POST `{ url }`. Runs `packages/engine/diagnose.mjs` (`detectOnce`, `summarize`, which run
  `data/rules/detect.js`) in a server Chromium (`@sparticuz/chromium` on Vercel, local Chrome otherwise). There is no
  second detector here.

- `app/tone/`: the tone map. A pad on commerce to brand personality and minimal to expressive, a genre filter, the
  four nearest reference sites, and three registry parts running in the tokens of the spot (`packages/engine/tone.mjs`, the
  same rules as the `pick_tone` tool). The address carries the spot, so an agent can hand over a link.
- `app/demo/`: the worked rebuild (`examples/rebuild/before.html` and `after.html`, copied to `public/examples/rebuild/`
  by `scripts/copy-fixtures.mjs`) in two same-origin frames at 1300x871, rebuilt by agents. A diagnose crew visits what
  the pinned `detect.js` finds inside the before frame (plus a hidden 390 wide frame for the rules only a phone shows);
  a rebuild crew builds the after page layer by layer from its own DOM (`app/demo/measure.ts`: every box and every
  line of text in document order, at most 190); a system cursor moves the after page's radius and spacing tokens; an
  end card gives the agents, the seconds and the rule counts. The timeline is `app/demo/timeline.ts` (pure functions of
  time, tested in `test/demo-timeline.test.ts`), with the cursor curves and arrow from Stageshow in
  `app/demo/stageshow.ts`; with reduced motion the page shows the end state and the steps as a list.
- `app/api/tone-shot/route.ts`: POST `{ ids }`, up to four ids from `data/taxonomy/tone-refs.json`, never a typed
  address. Opens each first screen through the same fence (`lib/tone-shot.ts` with `packages/engine/tone-capture.mjs`):
  cookie banners are only rejected, a banner without a reject button comes back as `consent` and a bot check or
  block page as `blocked`, both with no picture. Pictures are never written to disk and are kept in server memory up
  to 30 minutes. 20 calls per IP per 10 minutes, and a ceiling per minute across all visitors.

## Recording the demo on other pages

`node apps/web/scripts/demo/record.mjs --before <url> --after <url> --out <file.mp4>` plays the same diagnose, rebuild,
tune and end card on any two pages you can open, at 1280x800 by default (`--width`, `--height`, `--scheme dark|light`,
`--speed 2`, `--site` for a local build instead of the hosted one). It steps the demo frame by frame and captures each
one, 60 per second by default (`--fps`), so no frame drops on a heavy page. Every recording opens on a short arc that
tells the whole story in under ten seconds (the first screen of both pages diagnosed all at once, rebuilt, and a
before and after beat, labeled Before and After), then plays the full page; `--one-screen` records only the arc, `--pace
fast` plays the full page quicker, `--no-intro` leaves the arc out. As it steps it checks frames (the drawing
pointers in the window, the camera behind the work, each outline on its element) and writes them to
`<out>.check.json`; `--check` fails the run on a miss. The two pages load straight into a local Chromium started with
web security off, so the overlay can measure them across origins; nothing is uploaded. `--out` is required and must be
outside the repository, so a recording of a private page never lands in a commit. It needs ffmpeg.

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

## What the site keeps

- No analytics scripts and no cookies. The diagnosis, brand and MCP routes keep neither the address nor the result:
  the answer goes back and nothing is stored.
- A page that cannot be opened is logged with its host name only (`hostsOnly` in `lib/diagnose.ts`), never the path
  or the query.
- The diagnosis page keeps the address after `#url=`, which the browser does not send, so a reload or a shared link
  does not put it in a request line or a log. Links made with the older `?url=` still open.
- The rate limits keep client IP addresses in instance memory (`lib/limits.ts`), gone when the instance restarts.
- The tone map's reference screens are kept in memory for up to 30 minutes and given to every visitor who asks for the
  same sites, never written to disk.
- The gallery keeps the visitor's settings in their browser, under the `localStorage` key `taster-studio`.
- Vercel keeps its own request logs under its policy.

The home page says the same in Korean, in its footer.

## Link preview, crawlers and headers

Each page sets its own title, description, canonical address and Open Graph and Twitter card tags through
`lib/page-meta.ts`; `app/layout.tsx` holds only the defaults. The image is `public/og.png`, rendered from
`scripts/og/card.html` with the registry tokens by `node scripts/og/render.mjs`, which also writes the rule counts it
drew to `scripts/og/meta.json`. Re-render it when the copy, the address or the rules change: `npm --prefix apps/web test`
fails while the counts are stale. `app/robots.ts` keeps crawlers off `/api/` and `/board`, `app/sitemap.ts` lists the
pages and every component, and `app/not-found.tsx` is the 404 screen.

`next.config.mjs` sends a content security policy (everything from this site, data: pictures, no framing except the
stage and the demo's example pages by this site) and a permissions policy on every response. The bookmarklet's files under `/taster/` are open to
every origin; a folder named after their hash is cached for good, the old `/taster/*.js` for five minutes.
`node scripts/check-metadata.mjs` checks all of it on a running build.

## Bookmarklet

`app/bookmarklet/` makes the bookmarklet from `public/taster/bookmarklet.json`, which `scripts/copy-fixtures.mjs`
writes on every build: the folder `/taster/<version>-<hash>/` and the overlay's sha384. The bookmark loads the overlay
from that folder with that sha384 and no Referer, and the overlay loads the detector and the rule names next to it,
each pinned to its own sha384, so a bookmark runs only the files it was made with. After a build with new files, an old
bookmark's folder is gone and the bookmarklet asks for the current one. A bookmark saved before the pinned folders
loads `/taster/overlay.js`, which is not pinned, and sends that one request with a Referer; the fix is to drag the
bookmarklet from `/bookmarklet` again.

## Commands

```bash
npm ci --prefix apps/web
npm ci --prefix packages/engine --omit=dev --ignore-scripts
npm --prefix apps/web run dev          # http://localhost:3240
npm --prefix apps/web run typecheck
npm --prefix apps/web test             # guard, limits, fenced engine on data/rules/fixtures
node scripts/gates.mjs web        # every web gate CI runs: build, traces, tests, then the browser checks on the served build
```

The web job's gates one by one (the build, the five browser scripts against a running server and how to pick its
port) are in `CONTRIBUTING.md`.

The fixture tests serve `data/rules/fixtures` on loopback and pass a test-only `allowLoopback` argument; no request
path sets it, and private ranges stay blocked even then.

## Deploy

Vercel project with root directory `apps/web`, deployed from Git only. `vercel.json` turns off every branch except
`main`, so there are no preview builds. The build copies `data/rules/fixtures/{slop,clean,slop-ko}.html` to
`/fixtures/` so the live site can be checked against a known slop page and a known clean page.
