// First screens of the tone references, opened through the fenced server browser (browser.ts): public addresses only,
// a request budget per page, GET and HEAD only. packages/engine/tone-capture.mjs does the page work, the same code the local
// MCP server runs: reject buttons only, never accept, and no picture of a bot check or block page.
// A picture is never written to disk and is kept in server memory up to 30 minutes, so a cold instance simply opens
// the site again. A site with a cookie banner that offers no reject button comes back as `consent`, with no picture.
import { readFirstScreen } from '../../../packages/engine/tone-capture.mjs';
import { closeBrowser, fencePage, launchBrowser, type Budget } from './browser.ts';

export type Shot = { status: 'ok'; image: string } | { status: 'blocked' | 'consent' | 'failed' | 'busy' };
export type Target = { id: string; url: string };

const KEEP_MS = 30 * 60 * 1000;
const KEEP_MAX = 40;
const kept = new Map<string, { at: number; shot: Shot }>();

export function keptShot(url: string, now = Date.now()): Shot | null {
  const hit = kept.get(url);
  if (!hit) return null;
  if (now - hit.at > KEEP_MS) {
    kept.delete(url);
    return null;
  }
  return hit.shot;
}

function keep(url: string, shot: Shot) {
  // A failure may be the network or the deadline, so the next visitor tries again.
  if (shot.status === 'failed' || shot.status === 'busy') return;
  kept.delete(url);
  kept.set(url, { at: Date.now(), shot });
  while (kept.size > KEEP_MAX) kept.delete(kept.keys().next().value as string);
}

/** True when every target already has a kept picture, so the caller can skip the rate limit and the browser gate. */
export const allKept = (targets: Target[]) => targets.every((t) => keptShot(t.url));

// allowLoopback is for test/ only; the API route never passes it.
export async function captureShots(targets: Target[], { deadlineMs = 45000, settleMs = 2500, allowLoopback = false } = {}): Promise<Record<string, Shot>> {
  const out: Record<string, Shot> = {};
  const todo: Target[] = [];
  for (const t of targets) {
    const hit = keptShot(t.url);
    if (hit) out[t.id] = hit;
    else todo.push(t);
  }
  if (!todo.length) return out;

  const browser = await launchBrowser();
  let timer: NodeJS.Timeout | undefined;
  let late = false;
  const deadline = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      late = true;
      resolve();
    }, deadlineMs);
  });
  const worker = async () => {
    for (let t = todo.shift(); t && !late; t = todo.shift()) {
      const budget: Budget = { requests: 0, bytes: 0, blocked: null, allowLoopback };
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, serviceWorkers: 'block', locale: 'en-US' }).catch(() => null);
      if (!context) break;
      try {
        const page = await context.newPage();
        await fencePage(page, budget);
        const read = await readFirstScreen(page, t.url, { settleMs, timeoutMs: 15000 });
        const shot: Shot = read.status === 'ok' ? { status: 'ok', image: `data:image/jpeg;base64,${read.image.toString('base64')}` } : { status: read.status };
        if (!late) out[t.id] = shot;
        keep(t.url, shot);
      } catch {
        // the page or the browser went away; the target stays failed
      } finally {
        await context.close().catch(() => {});
      }
    }
  };
  try {
    await Promise.race([Promise.all([worker(), worker()]), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
    await closeBrowser(browser);
  }
  for (const t of targets) out[t.id] ||= { status: 'failed' };
  return out;
}
