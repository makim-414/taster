// The number of rules the page talks about, read from rules.json at build time so the copy never drifts.
// Server side only: the client component receives the number as a prop instead of the whole file.
import rules from '../../../rules/rules.json';

export const RULE_COUNT: number = rules.rules.length;
// Rules the detector measures in a real browser; the manual ones are judged by eye, so the copy never counts them.
export const MEASURED_COUNT: number = rules.rules.filter((r) => r.detect.level !== 'manual').length;
