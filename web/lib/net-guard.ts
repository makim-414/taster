// Decides whether a URL may be fetched from the server. Every check runs on the resolved IP,
// never on the hostname alone, so names that point at private space (DNS rebinding,
// nip.io style hosts, internal records) are refused the same way IP literals are.
import { lookup as dnsLookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

// code is the stable part (the routes and the hosted MCP answer with it); the message is plain English for any caller,
// and the Korean home page words each code itself (lib/messages.ts).
export class BlockedError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Only public unicast space. ipaddr.js names every special range (loopback, private,
// linkLocal (169.254.0.0/16, the cloud metadata address), carrierGradeNat, uniqueLocal,
// multicast, reserved, unspecified, 6to4, teredo, rfc6052 and so on); anything that is not
// plain 'unicast' is refused. IPv4-mapped IPv6 is unwrapped first so ::ffff:127.0.0.1 is caught.
export function isPublicAddress(address: string, allowLoopback = false): boolean {
  if (!ipaddr.isValid(address)) return false;
  let ip = ipaddr.parse(address);
  if (ip.kind() === 'ipv6' && (ip as ipaddr.IPv6).isIPv4MappedAddress()) ip = (ip as ipaddr.IPv6).toIPv4Address();
  const range = ip.range();
  return range === 'unicast' || (allowLoopback && range === 'loopback');
}

// Parses and checks everything that does not need DNS.
export function parseTarget(raw: string): URL {
  let input = String(raw || '').trim();
  if (!input) throw new BlockedError('empty', 'no URL given');
  if (input.length > 2048) throw new BlockedError('too-long', 'the URL is longer than 2048 characters');
  // "example.com:8080" has no scheme even though it contains a colon.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input) && !/^(javascript|data|file|mailto|about|blob|vbscript|ftp|gopher):/i.test(input)) input = `https://${input}`;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BlockedError('invalid', 'not a valid URL');
  }
  checkUrlShape(url);
  return url;
}

// allowLoopback exists for the fixture tests only. No request path sets it.
export function checkUrlShape(url: URL, allowLoopback = false): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new BlockedError('scheme', 'only http and https URLs can be opened');
  if (url.username || url.password) throw new BlockedError('credentials', 'URLs with a user name or password are refused');
  if (!ALLOWED_PORTS.has(url.port)) throw new BlockedError('port', 'only ports 80, 443, 8080 and 8443 can be opened');
  const host = bareHost(url);
  if (!host) throw new BlockedError('invalid', 'not a valid URL');
  if (!allowLoopback && (host === 'localhost' || host.endsWith('.localhost'))) throw new BlockedError('private', 'private network addresses are refused');
  if (ipaddr.isValid(host) && !isPublicAddress(host, allowLoopback)) throw new BlockedError('private', 'private network addresses are refused');
}

// URL.hostname keeps the brackets around IPv6 literals and may end with a root dot.
export function bareHost(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
}

export type Resolved = { address: string; family: 4 | 6 };

// Resolves a hostname and refuses it if any of its addresses is not public. Checking all of
// them (not just the first) matters: a name with one public and one private record could
// otherwise be connected to the private one.
export async function resolvePublic(host: string, allowLoopback = false): Promise<Resolved> {
  if (ipaddr.isValid(host)) {
    if (!isPublicAddress(host, allowLoopback)) throw new BlockedError('private', 'private network addresses are refused');
    return { address: host, family: ipaddr.parse(host).kind() === 'ipv6' ? 6 : 4 };
  }
  let records: { address: string; family: number }[];
  try {
    records = await dnsLookup(host, { all: true, verbatim: true });
  } catch {
    throw new BlockedError('dns', 'the host name does not resolve');
  }
  if (!records.length) throw new BlockedError('dns', 'the host name does not resolve');
  for (const r of records) {
    if (!isPublicAddress(r.address, allowLoopback)) throw new BlockedError('private', 'names that resolve to private network addresses are refused');
  }
  const first = records[0];
  return { address: first.address, family: first.family === 6 ? 6 : 4 };
}
