import { RULE_COUNT } from '../lib/rule-count';
import { Diagnose } from './diagnose';

// The address a visitor diagnoses lives in the fragment (#url=), which only the browser reads, so this page never
// sees it and stays one static page.
export default function Page() {
  return <Diagnose ruleCount={RULE_COUNT} />;
}
