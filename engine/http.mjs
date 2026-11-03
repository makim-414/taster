// Hosted MCP over Streamable HTTP, stateless: every request builds a fresh server and transport, so it runs on
// serverless functions with no session store. The host passes `remote.diagnose`, and `remote.brand` and `remote.tone`
// when it has them, which must open pages only through its own fenced browser (public http(s) URLs, request budget,
// rate limit). See web/app/api/mcp/route.ts.
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer } from './server.mjs';

// Stateless mode has no event stream to open and no session to end, so GET and DELETE get 405 here instead of a
// stream the next microtask closes (which a client reconnects to) or a 200 for a session that never existed.
const notAllowed = () =>
  Response.json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed: this server is stateless, send JSON-RPC as POST.' }, id: null }, { status: 405, headers: { allow: 'POST' } });

/**
 * Answer one MCP request.
 * @param {Request} request a Web standard Request: POST with JSON-RPC; GET and DELETE answer 405 (see notAllowed)
 * @param {{ remote: { diagnose: (url: string) => Promise<{ report: unknown, shots?: Record<string, string> }>, brand?: (url: string) => Promise<unknown>, tone?: (ids: string[]) => Promise<Record<string, { status: string, image?: string }>> } }} options
 *   diagnose answers with the engine's report and a data URL per width; brand with a brand_theme result; tone with a
 *   data URL or a status per reference id. diagnose and brand throw "<code>: <message>" for what the agent should
 *   read (see createServer in server.mjs); any other error reaches the agent only as "internal: could not finish".
 * @returns {Promise<Response>}
 */
export async function handleMcpRequest(request, { remote }) {
  if (!remote || typeof remote.diagnose !== 'function') throw new Error('handleMcpRequest needs remote.diagnose');
  if (request.method === 'GET' || request.method === 'DELETE') return notAllowed();
  const server = createServer({ remote });
  // No session id: each POST stands alone. JSON responses instead of SSE, since every tool returns one result.
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    // The response body is fully built in JSON mode, so the server can close as soon as it is returned.
    queueMicrotask(() => server.close().catch(() => {}));
  }
}
