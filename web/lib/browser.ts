// Launches the server browser and fences it in. Every request a page makes is intercepted and
// fetched through pinnedFetch (public addresses only, re-checked on every redirect hop), and the
// browser itself is pointed at a dead proxy so anything that slips past interception
// (WebSocket, WebRTC, workers, cross-origin frames) has nowhere to go and simply fails.
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium as playwright, type Browser, type Page } from 'playwright-core';
import { BlockedError } from './net-guard.ts';
import { pinnedFetch } from './pinned-fetch.ts';

const FENCE_ARGS = [
  '--proxy-server=http://127.0.0.1:9',
  '--proxy-bypass-list=<-loopback>',
  '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  '--webrtc-ip-handling-policy=disable_non_proxied_udp',
];
const FENCE_DISABLED_FEATURES = ['NetworkPrediction', 'PrivateNetworkAccessSendPreflights'];
// Flags from @sparticuz/chromium this fence does not want: the page is untrusted, so keep the
// same-origin policy and mixed content blocking.
const DROP_ARGS = new Set(['--disable-web-security', '--allow-running-insecure-content']);

// Chromium only honours the last --disable-features flag, so all of them are merged into one.
function mergeArgs(base: string[]): string[] {
  const disabled = new Set(FENCE_DISABLED_FEATURES);
  const out: string[] = [];
  for (const arg of base) {
    if (DROP_ARGS.has(arg)) continue;
    if (arg.startsWith('--disable-features=')) {
      for (const f of arg.slice('--disable-features='.length).split(',')) if (f) disabled.add(f);
      continue;
    }
    out.push(arg);
  }
  return [...out, ...FENCE_ARGS, `--disable-features=${[...disabled].join(',')}`];
}

// Chromium's own stderr goes to the function log, a bounded number of lines per launch, so a
// crash on the platform leaves a trace.
function browserLogger() {
  let lines = 0;
  return {
    isEnabled: (name: string) => name === 'browser',
    log: (_name: string, _severity: string, message: string | Error) => {
      if (lines++ < 60) console.error(`[chromium] ${String(message).slice(0, 300)}`);
    },
  };
}
const MAC_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Noto Sans KR from the official noto-cjk repository, pinned to a release tag. The Lambda style
// Chromium ships almost no fonts, so Korean pages would render as empty boxes without it.
const KOREAN_FONT = 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@Sans2.004/Sans/SubsetOTF/KR/NotoSansKR-Regular.otf';

let fontReady: Promise<unknown> | null = null;

// The fontconfig file that ships with @sparticuz/chromium also scans /tmp/fonts.
async function installKoreanFont(): Promise<void> {
  const dir = path.join(tmpdir(), 'fonts');
  const file = path.join(dir, 'NotoSansKR-Regular.otf');
  if (existsSync(file)) return;
  const res = await fetch(KOREAN_FONT, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return;
  await mkdir(dir, { recursive: true });
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

export async function launchBrowser(): Promise<Browser> {
  if (process.platform === 'linux' && (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const executablePath = await chromium.executablePath();
    fontReady ||= installKoreanFont().catch(() => null);
    await fontReady;
    return playwright.launch({ executablePath, args: mergeArgs(chromium.args), headless: true, logger: browserLogger() });
  }
  const executablePath = process.env.CHROME_PATH || (existsSync(MAC_CHROME) ? MAC_CHROME : undefined);
  return playwright.launch({ executablePath, args: mergeArgs([]), headless: true });
}

export type Budget = { requests: number; bytes: number; blocked: string | null; allowLoopback?: boolean };
const MAX_REQUESTS = 400;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;
const FORWARD_HEADERS = ['accept', 'accept-language', 'user-agent', 'referer', 'range'];

type PausedRequest = { requestId: string; frameId: string; resourceType: string; request: { url: string; method: string; headers: Record<string, string> } };

function forwardHeaders(headers: Record<string, string>): Record<string, string> {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  const out: Record<string, string> = {};
  for (const name of FORWARD_HEADERS) if (lower[name]) out[name] = lower[name];
  return out;
}

// Installs the request fence on a fresh page through the CDP Fetch domain rather than
// page.route: Chromium pauses every hop of a redirect chain there, so each Location is checked
// like a new request (page.route only sees the first URL and lets the browser follow the rest
// itself). Only GET and HEAD leave the server: the page is read, never used to post forms or
// call APIs that change something on someone else's site.
export async function fencePage(page: Page, budget: Budget): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const tree = (await cdp.send('Page.getFrameTree')) as { frameTree: { frame: { id: string } } };
  const mainFrameId = tree.frameTree.frame.id;
  cdp.on('Fetch.requestPaused', async (event: PausedRequest) => {
    const { requestId, request } = event;
    const isMainDoc = event.resourceType === 'Document' && event.frameId === mainFrameId;
    const fail = (errorReason: 'BlockedByClient' | 'Failed') => cdp.send('Fetch.failRequest', { requestId, errorReason }).catch(() => {});
    const method = request.method;
    if (method !== 'GET' && method !== 'HEAD') return fail('BlockedByClient');
    if (++budget.requests > MAX_REQUESTS || budget.bytes > MAX_TOTAL_BYTES) return fail('BlockedByClient');
    try {
      const res = await pinnedFetch(request.url, { method, headers: forwardHeaders(request.headers), timeoutMs: isMainDoc ? 12000 : 8000, allowLoopback: budget.allowLoopback });
      budget.bytes += res.body.length;
      await cdp.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: res.status,
        responseHeaders: Object.entries(res.headers).map(([name, value]) => ({ name, value })),
        body: res.body.toString('base64'),
      });
    } catch (err) {
      if (isMainDoc && err instanceof BlockedError) budget.blocked = err.message;
      await fail(err instanceof BlockedError ? 'BlockedByClient' : 'Failed');
    }
  });
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
}
