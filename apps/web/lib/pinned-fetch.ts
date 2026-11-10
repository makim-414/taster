// Server-side fetch that connects only to the address net-guard approved. The approved IP is
// handed to the socket through `lookup`, so the name cannot resolve to something else between
// the check and the connection. Redirects are not followed here: the caller gets the 3xx back
// and the next hop is checked from scratch.
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import type { LookupFunction } from 'node:net';
import { bareHost, BlockedError, checkUrlShape, resolvePublic } from './net-guard.ts';

export type FetchResult = { status: number; headers: Record<string, string>; body: Buffer; url: string };
export type FetchOptions = { method?: 'GET' | 'HEAD'; headers?: Record<string, string>; timeoutMs?: number; maxBytes?: number; allowLoopback?: boolean };

// Headers that must not reach the page as is. Encoding and length change because the body is
// decoded here; cookies are dropped both ways so no session leaks between diagnoses.
const DROP_RESPONSE = new Set([
  'set-cookie', 'content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive',
  'strict-transport-security', 'alt-svc', 'clear-site-data', 'public-key-pins', 'report-to', 'nel',
]);

function decode(body: Buffer, encoding: string): Buffer {
  const e = encoding.trim().toLowerCase();
  if (!e || e === 'identity') return body;
  if (e === 'gzip' || e === 'x-gzip') return zlib.gunzipSync(body);
  if (e === 'deflate') {
    try {
      return zlib.inflateSync(body);
    } catch {
      return zlib.inflateRawSync(body);
    }
  }
  if (e === 'br') return zlib.brotliDecompressSync(body);
  throw new Error(`unsupported content-encoding ${e}`);
}

export async function pinnedFetch(rawUrl: string, { method = 'GET', headers = {}, timeoutMs = 10000, maxBytes = 10 * 1024 * 1024, allowLoopback = false }: FetchOptions = {}): Promise<FetchResult> {
  const url = new URL(rawUrl);
  checkUrlShape(url, allowLoopback);
  const host = bareHost(url);
  const resolved = await resolvePublic(host, allowLoopback);
  const lookup: LookupFunction = (_name, options, callback) => {
    if (options && (options as { all?: boolean }).all) {
      (callback as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [{ address: resolved.address, family: resolved.family }]);
    } else {
      callback(null, resolved.address, resolved.family);
    }
  };
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? https : http;

  return new Promise<FetchResult>((resolve, reject) => {
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: host,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: { ...headers, host: url.host, 'accept-encoding': 'gzip, deflate, br' },
        lookup,
        servername: isHttps && !/^[\d.]+$|:/.test(host) ? host : undefined,
        timeout: timeoutMs,
        agent: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new BlockedError('too-large', 'response too large'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          try {
            const raw = Buffer.concat(chunks);
            const body = method === 'HEAD' ? Buffer.alloc(0) : decode(raw, String(res.headers['content-encoding'] || ''));
            const out: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.headers)) {
              if (v === undefined || DROP_RESPONSE.has(k)) continue;
              out[k] = Array.isArray(v) ? v.join(', ') : String(v);
            }
            if (out.location) {
              try {
                out.location = new URL(out.location, url).href;
              } catch {
                delete out.location;
              }
            }
            resolve({ status: res.statusCode || 502, headers: out, body, url: url.href });
          } catch (err) {
            reject(err);
          }
        });
        res.on('error', reject);
      },
    );
    const deadline = setTimeout(() => req.destroy(new Error('timeout')), timeoutMs);
    req.on('close', () => clearTimeout(deadline));
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}
