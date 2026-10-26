// Checks rules/rules.json against the repository rule schema and against detect.js.
// Prints RULES SCHEMA OK on success.
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url);
const doc = JSON.parse(readFileSync(new URL('rules/rules.json', ROOT), 'utf8'));
const detect = readFileSync(new URL('rules/detect.js', ROOT), 'utf8');
const errors = [];
const err = (m) => errors.push(m);

if (typeof doc.version !== 'string') err('version missing');
if (!Array.isArray(doc.rules) || doc.rules.length < 60) err(`expected 60 or more rules, got ${doc.rules && doc.rules.length}`);

const ids = new Set();
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
  if (!Array.isArray(r.refs)) err(`${at}: refs must be an array`);
  for (const ref of r.refs || []) {
    if (!ref || typeof ref.label !== 'string' || !/^https:\/\//.test(ref.url || '')) err(`${at}: each ref needs a label and an https url`);
  }
  const keys = Object.keys(r).sort().join(',');
  if (keys !== 'detect,fix,fix_patterns,id,korean,name,refs,severity,what,why') err(`${at}: unexpected keys ${keys}`);
}

const checked = new Set([...detect.matchAll(/flag\('([A-Z]{2,3}-\d{2})'/g)].map((m) => m[1]));
const measured = doc.rules.filter((r) => r.detect && r.detect.level !== 'manual').map((r) => r.id);
for (const id of measured) if (!checked.has(id)) err(`${id}: measured in rules.json but not checked in detect.js`);
for (const id of checked) if (!measured.includes(id)) err(`${id}: checked in detect.js but not measured in rules.json`);

if (errors.length) {
  for (const e of errors) console.log(`FAIL ${e}`);
  console.log(`RULES SCHEMA FAIL ${errors.length}`);
  process.exit(1);
}
const manual = doc.rules.length - measured.length;
console.log(`RULES SCHEMA OK rules=${doc.rules.length} measured=${measured.length} manual=${manual}`);
