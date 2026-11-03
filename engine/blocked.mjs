// Did the page that came back belong to the site? A bot check, a block or error page, or a sign-in page on another
// host is not the site, so its look says nothing about the site: diagnose reports it as not diagnosed instead of
// findings, and extract (rebuild, brand) refuses it. Nothing here tries to get past a check.
// Local files are the builder's own pages and are always read.

// Titles and short texts of bot checks and block pages. The same words the tone step's reference capture skips.
export const BLOCK_RE = /just a moment|attention required|access denied|verify you are human|are you a robot|captcha|request blocked|forbidden|unusual traffic|checking your browser|security check|not acceptable|you have been blocked/i;

// A wall says little: a matching text only counts when the page has under this many characters of text, and a
// matching title when under SHORT_TITLE_TEXT. A page that only embeds a captcha in its form says much more.
const SHORT_TEXT = 600;
const SHORT_TITLE_TEXT = 2000;

export class NotDiagnosedError extends Error {
  constructor(notDiagnosed) {
    super(notDiagnosed.message);
    this.name = 'NotDiagnosedError';
    this.notDiagnosed = notDiagnosed;
  }
}

const sameSite = (a, b) => {
  try {
    return new URL(a).host.replace(/^www\./, '') === new URL(b).host.replace(/^www\./, '');
  } catch {
    return true;
  }
};

// What the page shows, read in the page: its title, the start of its text, a challenge widget, a password field.
async function readPage(page) {
  const title = await page.title().catch(() => '');
  const seen = await page
    .evaluate(() => {
      const text = (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 4000);
      const frames = [...document.querySelectorAll('iframe')].map((f) => `${f.title || ''} ${f.getAttribute('src') || ''}`);
      const challenge = Boolean(window._cf_chl_opt) || Boolean(document.querySelector('#challenge-running, #challenge-form, #challenge-stage')) || frames.some((f) => /captcha|challenge|turnstile/i.test(f));
      return { text, challenge, password: Boolean(document.querySelector('input[type="password" i]')) };
    })
    .catch(() => ({ text: '', challenge: false, password: false }));
  return { title, ...seen };
}

const statusName = (status) =>
  status === 401 || status === 407 ? 'sign-in or protection page' : status === 404 || status === 410 ? 'not found page' : status === 429 ? 'rate limit page' : status >= 500 ? 'server error page' : 'error page';

const LABEL = { 'bot-check': 'bot check page', 'block-page': 'block page', 'sign-in': 'sign-in page on another host' };

/** The one sentence every surface (CLI, SARIF, MCP, web) shows for a page that was not diagnosed. */
export function notDiagnosedMessage({ reason, status, title, finalUrl, requestedUrl }) {
  const label = reason === 'http-error' ? statusName(status) : LABEL[reason] || 'page that is not the site';
  const details = [status ? `HTTP ${status}` : '', title ? `title "${title}"` : '', finalUrl && finalUrl !== requestedUrl ? `at ${finalUrl}` : ''].filter(Boolean).join(', ');
  return `not diagnosed: got a ${label}${details ? ` (${details})` : ''} instead of the site at ${requestedUrl}. Nothing was measured, so there are no findings about the site. Taster does not get past bot checks or sign-in; diagnose a local build or a page that opens without them.`;
}

/**
 * @param {{ status?: number | null, headers?: Record<string, string>, title?: string, text?: string, finalUrl?: string,
 *   requestedUrl: string, page?: import('playwright').Page, challenge?: boolean, password?: boolean }} load
 *   status and headers of the main response (page.goto's), the URLs before and after redirects, and the page itself;
 *   title, text, challenge (a captcha or challenge widget) and password (a password field) are read from it when not given.
 * @returns {Promise<{ diagnosed: true, status: number | null, finalUrl: string, title: string } |
 *   { diagnosed: false, reason: 'bot-check' | 'block-page' | 'http-error' | 'sign-in', status: number | null, finalUrl: string, title: string, message: string }>}
 */
export async function classifyLoad({ status = null, headers = {}, title, text, finalUrl, requestedUrl, page = null, challenge, password }) {
  finalUrl = finalUrl || requestedUrl;
  if (!/^https?:/i.test(requestedUrl)) return { diagnosed: true, status, finalUrl, title: title || '' };
  const read = page && (title === undefined || text === undefined || challenge === undefined || password === undefined) ? await readPage(page) : {};
  title = String(title ?? read.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  text = String(text ?? read.text ?? '').replace(/\s+/g, ' ').trim();
  challenge = challenge ?? read.challenge ?? false;
  password = password ?? read.password ?? false;
  const short = text.length < SHORT_TEXT;
  let reason = null;
  if (String(headers['cf-mitigated'] || '').toLowerCase() === 'challenge' || (challenge && short)) reason = 'bot-check';
  else if ((BLOCK_RE.test(title) && text.length < SHORT_TITLE_TEXT) || (BLOCK_RE.test(text) && short)) reason = 'block-page';
  else if (status >= 400) reason = 'http-error';
  else if (password && !sameSite(requestedUrl, finalUrl)) reason = 'sign-in';
  if (!reason) return { diagnosed: true, status, finalUrl, title };
  return { diagnosed: false, reason, status, finalUrl, title, message: notDiagnosedMessage({ reason, status, title, finalUrl, requestedUrl }) };
}
