// Checks rules/rules.json against the repository rule schema and against detect.js.
// Prints RULES SCHEMA OK on success.
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const doc = JSON.parse(readFileSync(new URL('rules/rules.json', ROOT), 'utf8'));
const detect = readFileSync(new URL('rules/detect.js', ROOT), 'utf8');
const errors = [];
const err = (m) => errors.push(m);

// Where a rule's case comes from; rules.json basis_kinds says what each kind means. A ref on a standards host
// backs "standard", any other ref backs "external", and "taster-observation" is said in the rule's observation.
const BASIS = ['external', 'standard', 'taster-observation'];
const STANDARD_HOSTS = new Set(['www.w3.org', 'developer.mozilla.org', 'developer.apple.com']);
// supports is what the page says that backs the rule: a short quote, or a line in our own words marked summary.
const QUOTE_MAX_WORDS = 15;
const SUMMARY_MAX_WORDS = 30;
const RULE_KEYS = ['basis', 'detect', 'fix', 'fix_patterns', 'id', 'korean', 'name', 'observation', 'refs', 'severity', 'what', 'why'];
const REF_KEYS = ['accessed', 'derived_from', 'label', 'summary', 'supports', 'url'];
const words = (s) => s.trim().split(/\s+/).length;

if (typeof doc.version !== 'string') err('version missing');
if (!Array.isArray(doc.rules) || doc.rules.length < 60) err(`expected 60 or more rules, got ${doc.rules && doc.rules.length}`);
for (const b of BASIS) if (typeof doc.basis_kinds?.[b] !== 'string') err(`basis_kinds.${b} missing`);
for (const b of Object.keys(doc.basis_kinds || {})) if (!BASIS.includes(b)) err(`basis_kinds has unknown kind ${b}`);

const ids = new Set();
const supportsAt = new Map(); // url and supports -> the rule that first said it
for (const r of doc.rules) {
  const at = r.id || '(no id)';
  if (!/^[A-Z]{2,3}-\d{2}$/.test(r.id || '')) err(`${at}: id must look like AC-01`);
  if (ids.has(r.id)) err(`${at}: duplicate id`);
  ids.add(r.id);
  for (const k of ['name', 'what', 'why', 'fix']) if (typeof r[k] !== 'string' || r[k].trim().length < 3) err(`${at}: ${k} missing`);
  if (!['high', 'medium', 'low'].includes(r.severity)) err(`${at}: severity must be high, medium or low`);
  if (typeof r.korean !== 'boolean') err(`${at}: korean must be a boolean`);
  if (r.korean !== r.id.startsWith('KO-')) err(`${at}: korean flag does not match the KO- prefix`);
  const d = r.detect || {};
  if (!['deterministic', 'heuristic', 'manual'].includes(d.level)) err(`${at}: bad detect.level`);
  if (typeof d.signal !== 'string' || d.signal.length < 10) err(`${at}: detect.signal missing`);
  if (!Array.isArray(d.selectors)) err(`${at}: detect.selectors must be an array`);
  if (!d.css || typeof d.css !== 'object' || Array.isArray(d.css)) err(`${at}: detect.css must be an object`);
  if (!Array.isArray(r.fix_patterns)) err(`${at}: fix_patterns must be an array`);
  for (const k of Object.keys(r)) if (!RULE_KEYS.includes(k)) err(`${at}: unexpected key ${k}`);
  for (const k of RULE_KEYS) if (k !== 'observation' && !(k in r)) err(`${at}: missing key ${k}`);

  const basis = Array.isArray(r.basis) ? r.basis : [];
  if (!basis.length) err(`${at}: basis must be a non-empty array of ${BASIS.join(', ')}`);
  for (const b of basis) if (!BASIS.includes(b)) err(`${at}: unknown basis ${b}`);
  if (new Set(basis).size !== basis.length) err(`${at}: basis repeats a kind`);
  if (basis.includes('taster-observation')) {
    if (typeof r.observation !== 'string' || r.observation.trim().length < 10) err(`${at}: basis taster-observation needs an observation saying what Taster saw`);
  } else if ('observation' in r) err(`${at}: observation given but basis has no taster-observation`);

  if (!Array.isArray(r.refs)) err(`${at}: refs must be an array`);
  const kinds = new Set();
  for (const ref of r.refs || []) {
    if (!ref || typeof ref.label !== 'string' || !/^https:\/\//.test(ref.url || '')) {
      err(`${at}: each ref needs a label and an https url`);
      continue;
    }
    const on = `${at}: ref ${ref.url}`;
    for (const k of Object.keys(ref)) if (!REF_KEYS.includes(k)) err(`${on} has unexpected key ${k}`);
    if (typeof ref.supports !== 'string' || ref.supports.trim().length < 3) err(`${on} needs supports, what the page says that backs the rule`);
    else {
      if ('summary' in ref && ref.summary !== true) err(`${on}: summary is true or left out`);
      const n = words(ref.supports);
      if (ref.summary && n > SUMMARY_MAX_WORDS) err(`${on}: summary has ${n} words, keep it to one line of ${SUMMARY_MAX_WORDS}`);
      if (!ref.summary && n > QUOTE_MAX_WORDS) err(`${on} quotes ${n} words; quote ${QUOTE_MAX_WORDS} or fewer, or say it in our words and mark summary`);
      // The same page backing several rules says something different for each, or it was pasted on in bulk.
      const key = `${ref.url}\n${ref.supports.trim().toLowerCase()}`;
      if (supportsAt.has(key)) err(`${on} has the same supports as ${supportsAt.get(key)}; quote what the page says for this rule`);
      else supportsAt.set(key, at);
    }
    const day = /^\d{4}-\d{2}-\d{2}$/.test(ref.accessed || '') ? Date.parse(`${ref.accessed}T00:00:00Z`) : NaN;
    if (Number.isNaN(day) || day > Date.now()) err(`${on} needs accessed, the YYYY-MM-DD the supports was read on the page`);
    if ('derived_from' in ref && !/^https:\/\//.test(ref.derived_from || '')) err(`${on}: derived_from must be the https url of the source it copies`);
    kinds.add(STANDARD_HOSTS.has(new URL(ref.url).hostname) ? 'standard' : 'external');
  }
  for (const k of ['external', 'standard']) {
    const what = k === 'standard' ? `a standards host (${[...STANDARD_HOSTS].join(', ')})` : 'an outside write-up';
    if (basis.includes(k) && !kinds.has(k)) err(`${at}: basis says ${k} but no ref is on ${what}`);
    if (!basis.includes(k) && kinds.has(k)) err(`${at}: a ref is on ${what} but basis does not say ${k}`);
  }
}

// detect.js registers one checker per rule as R['AC-01'] = function () { ... } and runs them in the order of
// var ORDER = [...]. A checker left out of ORDER never runs, so every measured rule must be in both, once.
const registered = [...detect.matchAll(/R\['([A-Z]{2,3}-\d{2})'\]\s*=\s*function/g)].map((m) => m[1]);
const orderList = detect.match(/var ORDER = \[([\s\S]*?)\];/);
if (!orderList) err('detect.js: var ORDER = [...] not found');
const order = orderList ? [...orderList[1].matchAll(/'([A-Z]{2,3}-\d{2})'/g)].map((m) => m[1]) : [];
const twice = (list) => [...new Set(list.filter((id, i) => list.indexOf(id) !== i))];
for (const id of twice(registered)) err(`${id}: registered twice in detect.js`);
for (const id of twice(order)) err(`${id}: listed twice in ORDER in detect.js`);
const measured = doc.rules.filter((r) => r.detect && r.detect.level !== 'manual').map((r) => r.id);
for (const id of measured) {
  if (!registered.includes(id)) err(`${id}: measured in rules.json but not checked in detect.js`);
  if (!order.includes(id)) err(`${id}: measured in rules.json but missing from ORDER in detect.js, so it never runs`);
}
for (const id of new Set(registered)) if (!measured.includes(id)) err(`${id}: checked in detect.js but not measured in rules.json`);
for (const id of new Set(order)) if (!registered.includes(id)) err(`${id}: in ORDER but detect.js has no R['${id}'] checker`);

if (errors.length) {
  for (const e of errors) console.log(`FAIL ${e}`);
  console.log(`RULES SCHEMA FAIL ${errors.length}`);
  process.exit(1);
}
const manual = doc.rules.length - measured.length;
const basisCount = BASIS.map((b) => `${b}=${doc.rules.filter((r) => r.basis.includes(b)).length}`).join(' ');
console.log(`RULES SCHEMA OK rules=${doc.rules.length} measured=${measured.length} manual=${manual} ${basisCount}`);
