#!/usr/bin/env node
// ACP agent over stdio (Agent Client Protocol, https://agentclientprotocol.com), so editors such as Zed and
// JetBrains IDEs can run Taster from their agent panel. No language model inside: every reply is computed.
// Slash commands: /start, /diagnose, /extract, /brand, /explain, /rules, /help. The same functions as the MCP server.
import { existsSync, mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { PROTOCOL_VERSION, RequestError, agent, methods, ndJsonStream } from '@agentclientprotocol/sdk';
import { RULES, diagnose, explainRule, extract, formatText } from './diagnose.mjs';
import { brandTheme } from './brand.mjs';

const VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
const START_GUIDE = fileURLToPath(new URL('../skills/taster/references/start.md', import.meta.url));

export const COMMANDS = [
  { name: 'start', description: 'The opening question: does the site already exist, or are we building a new one?' },
  { name: 'diagnose', description: 'Open a page in a real browser at 1440 and 390 wide and list every slop finding by rule', input: { hint: 'URL or path to an HTML file' } },
  { name: 'extract', description: "Read a page's content in reading order, for a rebuild", input: { hint: 'URL or path to an HTML file' } },
  { name: 'brand', description: "Read a site's brand color, typeface and logo and return a token theme fitted to it", input: { hint: 'URL or path to an HTML file' } },
  { name: 'explain', description: 'What a rule flags, why, how it is found and the fix', input: { hint: 'rule id such as AC-01' } },
  { name: 'rules', description: 'Every rule with id, severity and how it is checked' },
  { name: 'help', description: 'What this agent can do' },
];

const HELP = [
  'Taster commands:',
  ...COMMANDS.map((c) => `  /${c.name}${c.input ? ` <${c.input.hint}>` : ''}  ${c.description}`),
  '',
  'This agent runs the Taster checks and answers with their results; it does not write code. For swaps, rebuilds and new',
  'screens, the Taster skill works best inside an agent that speaks MCP (engine/mcp.mjs), which can read and edit your files.',
].join('\n');

// The opening question lives in the skill's start guide, so the skill, the MCP prompt and this agent ask the same thing.
export function startQuestion() {
  const guide = readFileSync(START_GUIDE, 'utf8');
  const en = guide.match(/^> (.+)$/m)?.[1]?.trim();
  const ko = guide.match(/In Korean: "(.+?)"/)?.[1]?.trim();
  return [
    en,
    ko,
    '',
    'Already exists: send the address with /diagnose <url or file>, then /brand <url> to absorb its brand color, typeface and logo.',
    'Building a new one: tell me the product in one sentence, who the screen is for, what kind of screen it is, the real content you have, and your brand.',
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

// "/diagnose ./page.html" -> { command: 'diagnose', arg: './page.html' }. Plain text has no command.
export function parseCommand(text) {
  const m = String(text).trim().match(/^\/([\w-]+)\s*([\s\S]*)$/);
  return m ? { command: m[1].toLowerCase(), arg: m[2].trim() } : { command: null, arg: String(text).trim() };
}

// The prompt's text, plus the URI of an attached file or link, which an editor sends as a resource_link block.
function promptText(blocks) {
  const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
  const link = blocks.find((b) => b.type === 'resource_link' || b.type === 'resource');
  const uri = link?.uri || link?.resource?.uri;
  if (!uri) return text;
  return /^\/[\w-]+\s*$/.test(text) ? `${text} ${uri}` : text || uri;
}

// A relative file path is read from the session's working folder, not from wherever the editor started this process.
function resolveTarget(arg, cwd) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(arg) || isAbsolute(arg)) return arg;
  const local = resolve(cwd || process.cwd(), arg);
  return existsSync(local) ? local : arg;
}

function explainText(rule) {
  return [
    `${rule.id}  ${rule.name}  [${rule.severity}, ${rule.detect.level}]`,
    '',
    `What: ${rule.what}`,
    `Why: ${rule.why}`,
    `How it is found: ${rule.detect.signal}`,
    `Fix: ${rule.fix}`,
    rule.fix_patterns?.length ? `Fix patterns: ${rule.fix_patterns.join(', ')}` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

const rulesText = () => RULES.map((r) => `${r.id.padEnd(7)} ${r.detect.level.padEnd(14)} ${r.severity.padEnd(7)} ${r.name}`).join('\n');
const fence = (text, lang = '') => `\`\`\`${lang}\n${text}\n\`\`\``;

class Cancelled extends Error {}
// The browser work does not take a signal, so a cancelled turn stops waiting for it and drops the result.
function untilAborted(promise, signal) {
  if (signal.aborted) return Promise.reject(new Cancelled());
  return new Promise((ok, fail) => {
    const onAbort = () => fail(new Cancelled());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (v) => (signal.removeEventListener('abort', onAbort), ok(v)),
      (e) => (signal.removeEventListener('abort', onAbort), fail(e)),
    );
  });
}

export function createAgent() {
  const sessions = new Map();

  return agent({ name: 'taster' })
    .onRequest(methods.agent.initialize, () => ({
      // Version 1 is the only one this agent speaks; the spec says to answer with the latest supported one.
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: {
        loadSession: false,
        promptCapabilities: { image: false, audio: false, embeddedContext: false },
      },
      agentInfo: { name: 'taster', title: 'Taster', version: VERSION },
      // No account: the only setup is a browser for page checks. Clients that support terminal setup can run it
      // before first use (`taster acp --setup`); nothing ever requires it, and authenticate is a no-op.
      authMethods: [
        { id: 'setup', name: 'Set up the browser', description: 'Checks for Chrome or Chromium and downloads Chromium once if neither works.', type: 'terminal', args: ['acp', '--setup'], env: {} },
      ],
    }))
    .onRequest(methods.agent.authenticate, () => ({}))
    .onRequest(methods.agent.session.new, ({ params, client }) => {
      const sessionId = randomUUID();
      sessions.set(sessionId, { cwd: params.cwd, turn: null });
      // The command list goes out right after the client has the session id.
      setTimeout(() => {
        client
          .notify(methods.client.session.update, { sessionId, update: { sessionUpdate: 'available_commands_update', availableCommands: COMMANDS } })
          .catch(() => {});
      }, 0);
      return { sessionId };
    })
    .onNotification(methods.agent.session.cancel, ({ params }) => {
      sessions.get(params.sessionId)?.turn?.abort();
    })
    .onRequest(methods.agent.session.prompt, async ({ params, client }) => {
      const session = sessions.get(params.sessionId);
      if (!session) throw RequestError.sessionNotFound(params.sessionId);
      session.turn?.abort();
      const turn = new AbortController();
      session.turn = turn;
      const { sessionId } = params;
      const update = (u) => client.notify(methods.client.session.update, { sessionId, update: u });
      const messageId = randomUUID();
      const say = (text) => update({ sessionUpdate: 'agent_message_chunk', messageId, content: { type: 'text', text } });

      // One browser run, shown in the editor as a tool call, then its result as a message.
      const browserRun = async (title, run, render, { locations } = {}) => {
        const toolCallId = `taster-${randomUUID()}`;
        await update({ sessionUpdate: 'tool_call', toolCallId, title, kind: 'fetch', status: 'pending', locations });
        await update({ sessionUpdate: 'tool_call_update', toolCallId, status: 'in_progress' });
        let result;
        try {
          result = await untilAborted(run(), turn.signal);
        } catch (err) {
          if (err instanceof Cancelled) throw err;
          await update({ sessionUpdate: 'tool_call_update', toolCallId, status: 'failed', content: [{ type: 'content', content: { type: 'text', text: err.message } }] });
          await say(`${title} failed: ${err.message}`);
          return;
        }
        const { summary, message, files = [] } = render(result);
        await update({
          sessionUpdate: 'tool_call_update',
          toolCallId,
          status: 'completed',
          content: [{ type: 'content', content: { type: 'text', text: summary } }],
          locations: files.length ? files.map((path) => ({ path })) : undefined,
        });
        await say(message);
      };

      try {
        const { command, arg } = parseCommand(promptText(params.prompt));
        const target = arg ? resolveTarget(arg, session.cwd) : '';
        const needsTarget = (name) => say(`Usage: /${name} <URL or path to an HTML file>`);
        const fileLocation = target && isAbsolute(target) && existsSync(target) ? [{ path: target }] : undefined;

        if (command === null) {
          await say(`Taster runs on slash commands here. Start with /start, or /diagnose <url>.\n\n${HELP}`);
        } else if (command === 'help') {
          await say(HELP);
        } else if (command === 'start') {
          await say(startQuestion());
        } else if (command === 'rules') {
          await say(fence(rulesText()));
        } else if (command === 'explain') {
          const rule = arg ? explainRule(arg) : null;
          await say(rule ? explainText(rule) : `Unknown rule: ${arg || '(none)'}. /rules lists every rule id.`);
        } else if (command === 'diagnose') {
          if (!target) await needsTarget('diagnose');
          else {
            // The annotated captures stay on disk so the editor can open them.
            const outDir = mkdtempSync(join(tmpdir(), 'taster-acp-'));
            await browserRun(`Diagnose ${arg}`, () => diagnose(target, { outDir }), (report) => ({
              summary: `${report.rulesHit} of ${report.measured} measured rules hit, ${report.findings} findings at ${report.widths.join(' and ')} wide`,
              message: fence(formatText(report)),
              files: report.screenshots,
            }), { locations: fileLocation });
          }
        } else if (command === 'extract') {
          if (!target) await needsTarget('extract');
          else {
            await browserRun(`Extract ${arg}`, () => extract(target), (content) => ({
              summary: `${content.sections?.length ?? 0} sections read`,
              message: fence(JSON.stringify(content, null, 2), 'json'),
            }), { locations: fileLocation });
          }
        } else if (command === 'brand') {
          if (!target) await needsTarget('brand');
          else {
            await browserRun(`Brand ${arg}`, async () => brandTheme(await extract(target)), (theme) => ({
              summary: `${Object.keys(theme.tokens).length} token overrides`,
              message: `${fence(theme.css, 'css')}\n\n${theme.notes.map((n) => `- ${n}`).join('\n')}`,
            }), { locations: fileLocation });
          }
        } else {
          await say(`Unknown command /${command}.\n\n${HELP}`);
        }
      } catch (err) {
        if (!(err instanceof Cancelled)) throw err;
      } finally {
        if (session.turn === turn) session.turn = null;
      }
      return { stopReason: turn.signal.aborted ? 'cancelled' : 'end_turn' };
    });
}

// stdout carries the protocol; anything else goes to stderr.
// Run when started directly or through the taster-acp bin link; importing it (tests) only defines createAgent.
const isMain = (() => {
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();
// Serve on this process's stdio until the editor closes it. start.mjs calls this after its first-run install.
export function serve() {
  const stream = ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin));
  const connection = createAgent().connect(stream);
  connection.closed.then(() => process.exit(0));
}
if (isMain) serve();
