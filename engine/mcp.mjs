#!/usr/bin/env node
// MCP server over stdio for local agents (Claude Code, Codex, Cursor). The tools live in server.mjs.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.mjs';

await createServer().connect(new StdioServerTransport());
