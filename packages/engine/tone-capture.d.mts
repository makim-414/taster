// Types for packages/engine/tone-capture.mjs. The page is any Playwright page (playwright or playwright-core), typed loosely so
// the web app does not need the engine's copy of Playwright to typecheck.

export const REJECT_LABELS: string[];
export const BLOCK_RE: RegExp;
export type FirstScreen =
  | { status: 'ok'; image: Buffer; title: string; rejected: string }
  | { status: 'blocked'; code: number; title: string }
  | { status: 'consent'; title: string; rejected: string }
  | { status: 'failed'; reason: string };
export function pressReject(page: unknown): Promise<string>;
export function consentOpen(page: unknown): Promise<boolean>;
export function readFirstScreen(page: unknown, url: string, options?: { settleMs?: number; timeoutMs?: number; quality?: number }): Promise<FirstScreen>;
