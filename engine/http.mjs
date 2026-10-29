// Hosted MCP over Streamable HTTP, stateless: every request builds a fresh server and transport, so it runs on
// serverless functions with no session store. The host passes `remote.diagnose`, which must open pages only
// through its own fenced browser (public http(s) URLs, request budget, rate limit). See web/app/api/mcp/route.ts.
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer } from './server.mjs';

/**
 * Answer one MCP request.
 * @param {Request} request a Web standard Request (POST with JSON-RPC, or GET and DELETE, which stateless mode refuses)
 * @param {{ remote: { diagnose: (url: string) => Promise<{ report: unknown, shots?: Record<string, string> }> } }} options
 * @returns {Promise<Response>}
 */
export async function handleMcpRequest(request, { remote }) {
  if (!remote || typeof remote.diagnose !== 'function') throw new Error('handleMcpRequest needs remote.diagnose');
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
