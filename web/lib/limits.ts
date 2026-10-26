// Per-instance guards: a sliding window per client IP and a small gate so one instance never
// runs more than one Chromium at a time. State lives in memory, so it resets with the instance;
// it stops casual abuse, and a platform firewall rule can sit in front for the rest.
const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = 6;
const hits = new Map<string, number[]>();

export function takeToken(ip: string, now = Date.now()): { ok: boolean; retryAfter: number } {
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_IP) {
    hits.set(ip, recent);
    return { ok: false, retryAfter: Math.ceil((recent[0] + WINDOW_MS - now) / 1000) };
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  return { ok: true, retryAfter: 0 };
}

export function clientIp(headers: Headers): string {
  return headers.get('x-real-ip') || (headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

const MAX_WAITING = 2;
let running = false;
const queue: (() => void)[] = [];

export async function withGate<T>(fn: () => Promise<T>): Promise<T | null> {
  if (running) {
    if (queue.length >= MAX_WAITING) return null;
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  running = true;
  try {
    return await fn();
  } finally {
    const next = queue.shift();
    if (next) next();
    else running = false;
  }
}
