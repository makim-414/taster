// `taster live edit`: an agent says it changed a source file, so `taster watch` can capture the page again and show
// what the edit changed. Three ways in, one event out (`edit`, { file, tool } with the agent in the envelope):
//   Claude Code   the plugin's PostToolUse hook (hooks/hooks.json) runs `taster live edit` with the hook JSON on stdin
//   other agents  `taster live edit --file <path> [--tool <name>] [--agent <label>] [--client <name>]` (Codex, an ACP
//                 editor, a script)
//   the engine    `taster add` reports the files it wrote (cli.mjs)
// It must never slow down or fail the agent's edit: with no hub in the discovery file it returns at once without
// reading stdin, every error is swallowed, and the exit code is always 0. The file goes out relative to the folder the
// agent works in (a file outside it as its name only), never as an absolute path, and never with its contents.
import { createHash } from 'node:crypto';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import * as live from './live.mjs';

const MAX_STDIN = 256 * 1024;
const STDIN_MS = 1000;

const USAGE = `Usage: taster live edit [--file <path>] [--tool <name>] [--agent <label>] [--client <name>]

Tells a running \`taster watch\` that a source file changed, so it captures the page on its stage again and shows what
changed. With no --file it reads a Claude Code hook's JSON from stdin (tool_input.file_path, cwd, session_id). Does
nothing, and exits 0 at once, when no \`taster watch\` runs.`;

const short = (s, n) => {
  const str = String(s ?? '');
  return str.length > n ? str.slice(0, n) : str;
};
const idOf = (...parts) => createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 12);

/** A file as the viewer may show it: relative to cwd with forward slashes, or only its name when it is outside cwd. */
export function relFile(file, cwd = process.cwd()) {
  if (typeof file !== 'string' || !file) return null;
  const abs = isAbsolute(file) ? file : resolve(cwd, file);
  const rel = relative(cwd, abs);
  const out = !rel || rel.startsWith('..') || isAbsolute(rel) ? basename(abs) : rel;
  return short(out.split(sep).join('/'), 200);
}

/**
 * What a Claude Code PostToolUse hook input says about an edit: { file, tool, agent } or null.
 * Read: tool_name, tool_input.file_path (absolute for Edit and Write; MultiEdit and NotebookEdit are taken the same
 * way when they carry file_path or notebook_path), cwd, session_id, and agent_id / agent_type inside a subagent.
 */
export function editFromHook(input) {
  if (!input || typeof input !== 'object') return null;
  const ti = input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : {};
  const path = ti.file_path || ti.notebook_path || input.tool_response?.filePath;
  if (typeof path !== 'string' || !path) return null;
  const cwd = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
  const session = String(input.session_id || '');
  const sub = String(input.agent_id || '');
  return {
    file: relFile(path, cwd),
    tool: short(String(input.tool_name || 'Edit').replace(/[^\w.-]/g, ''), 40) || 'Edit',
    agent: {
      // One cursor per Claude Code session, and one more per subagent in it. The ids are hashed, never sent as they are.
      id: `cc-${idOf(session || cwd, sub)}`,
      kind: 'hook',
      client: 'claude-code',
      label: short(input.agent_type || basename(cwd), 60),
    },
  };
}

function readStdin() {
  return new Promise((done) => {
    if (process.stdin.isTTY) return done('');
    const chunks = [];
    let size = 0;
    const finish = () => {
      clearTimeout(timer);
      process.stdin.removeAllListeners('data');
      process.stdin.pause();
      done(Buffer.concat(chunks).toString('utf8'));
    };
    const timer = setTimeout(finish, STDIN_MS);
    process.stdin.on('data', (c) => {
      size += c.length;
      if (size <= MAX_STDIN) chunks.push(c);
    });
    process.stdin.once('end', finish);
    process.stdin.once('error', finish);
  });
}

function flags(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const m = /^--(file|tool|agent|client)$/.exec(argv[i]);
    if (m && argv[i + 1] !== undefined) out[m[1]] = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') out.help = true;
  }
  return out;
}

/** Send one edit event and wait for it to go out (up to 1.5 seconds). Never throws. */
export async function reportEdit({ file, tool, agent, files }) {
  try {
    if (!file) return false;
    live.setAgent(agent);
    live.emit('edit', { file, tool, ...(files?.length > 1 && { files: files.slice(0, 20) }) });
    await live.flush(1500);
    return true;
  } catch {
    return false;
  }
}

/** `taster live <verb>`: only `edit` for now. Resolves with the exit code, which is 0 for anything about an edit. */
export async function liveCommand(argv = [], { stdin = readStdin } = {}) {
  const [verb, ...rest] = argv;
  const f = flags(rest);
  if (verb !== 'edit' || f.help) {
    (verb === 'edit' || f.help ? console.log : console.error)(USAGE);
    return verb === 'edit' ? 0 : 2;
  }
  try {
    // The fast path: no hub, nothing to do, and stdin is not even read.
    if (!live.readDiscovery()) return 0;
    let edit;
    if (f.file) {
      const cwd = process.cwd();
      const label = short(f.agent || basename(cwd), 60);
      const client = f.client ? short(f.client, 60) : null;
      edit = { file: relFile(f.file, cwd), tool: short(f.tool || 'edit', 40), agent: { id: `edit-${idOf(client || '', label, cwd)}`, kind: 'cli', client, label } };
    } else {
      let input = null;
      try {
        input = JSON.parse(await stdin());
      } catch {
        return 0;
      }
      edit = editFromHook(input);
    }
    if (edit) await reportEdit(edit);
  } catch {
    // an edit report is never worth a failed hook
  }
  return 0;
}
