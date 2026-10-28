// The number of rules the page talks about, read from rules.json at build time so the copy never drifts.
// Server side only: the client component receives the number as a prop instead of the whole file.
import rules from '../../rules/rules.json';

export const RULE_COUNT: number = rules.rules.length;
