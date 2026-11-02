// Opens a reference site's first screen for the tone step, given a Playwright page the caller made (a local browser
// for the MCP server, the fenced server browser for the web). Nothing is written to disk: the picture goes back to
// the caller as bytes and the caller decides how long to hold it in memory.
// Cookie banners: only a reject or necessary-only button is pressed. A banner without one is hidden for the shot,
// never accepted. A bot check, a block page or an error status is reported as blocked and no picture is taken, so
// the caller shows the link only. Nothing here tries to get past a check.

export const REJECT_LABELS = [
  'Reject all', 'Reject All', 'Reject', 'Reject all cookies', 'Reject cookies', 'Reject additional cookies', 'Reject non-essential',
  'Decline', 'Decline all', 'Decline all cookies', 'I decline', 'Deny', 'Refuse all', 'Only necessary', 'Necessary only',
  'Use necessary cookies only', 'Only essential cookies', 'Continue without accepting', 'Opt out', 'No thanks',
  '모두 거부', '거부', '필수 쿠키만 허용', '필수만 허용',
];

export const BLOCK_RE = /just a moment|attention required|access denied|verify you are human|are you a robot|captcha|request blocked|forbidden|unusual traffic|checking your browser|security check|not acceptable|you have been blocked/i;

// Banner containers of the common consent tools, hidden for the shot when no reject button was found.
const HIDE_CSS = '#onetrust-banner-sdk,#onetrust-consent-sdk,#CybotCookiebotDialog,.osano-cm-window,#truste-consent-track,[id^="sp_message_container"],.cookie-banner,#cookie-banner,[class*="cookie-consent" i],[aria-label*="cookie" i][role="dialog"],[id*="cookie" i][class*="banner" i]{display:none!important}';

/** Press the first visible reject button, if there is one. Returns its label, or '' when none was pressed. */
export async function pressReject(page) {
  for (const label of REJECT_LABELS) {
    const button = page.getByRole('button', { name: label, exact: true });
    try {
      if (!(await button.count())) continue;
      const first = button.first();
      if (!(await first.isVisible())) continue;
      await first.click({ timeout: 2000 });
      return label;
    } catch {
      // detached or covered: try the next label
    }
  }
  return '';
}

/**
 * @param {import('playwright').Page} page a fresh page, sized as the shot should be
 * @param {string} url
 * @param {{ settleMs?: number, timeoutMs?: number, quality?: number }} [options]
 * @returns {Promise<{ status: 'ok', image: Buffer, title: string, rejected: string } | { status: 'blocked', code: number, title: string } | { status: 'failed', reason: string }>}
 */
export async function readFirstScreen(page, url, { settleMs = 2500, timeoutMs = 20000, quality = 62 } = {}) {
  let response;
  try {
    response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  } catch (err) {
    return { status: 'failed', reason: String(err?.message || err).split('\n')[0].slice(0, 160) };
  }
  const code = response?.status() ?? 0;
  await page.waitForTimeout(settleMs);
  const rejected = await pressReject(page);
  await page.addStyleTag({ content: HIDE_CSS }).catch(() => {});
  await page.waitForTimeout(rejected ? 600 : 200);
  const title = (await page.title().catch(() => '')).slice(0, 120);
  const text = (await page.evaluate(() => (document.body ? document.body.innerText : '').slice(0, 800)).catch(() => '')).replace(/\s+/g, ' ');
  if (code >= 400 || BLOCK_RE.test(title) || (BLOCK_RE.test(text) && text.length < 600)) return { status: 'blocked', code, title };
  try {
    const image = await page.screenshot({ type: 'jpeg', quality });
    return { status: 'ok', image, title, rejected };
  } catch (err) {
    return { status: 'failed', reason: String(err?.message || err).split('\n')[0].slice(0, 160) };
  }
}
