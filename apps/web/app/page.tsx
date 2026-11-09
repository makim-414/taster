import type { Metadata } from 'next';
import { pageMetadata } from '../lib/page-meta';
import { MEASURED_COUNT, RULE_COUNT } from '../lib/rule-count';
import { Diagnose } from './diagnose';

// Manual rules are judged by eye, so the description counts the measured ones apart (scripts/og/card.html does too).
const DESCRIPTION = `주소를 넣으면 1440 폭과 390 폭으로 열어, AI 가 만든 화면에서 자주 보이는 흔적을 찾습니다. 규칙 ${RULE_COUNT}개 중 ${MEASURED_COUNT}개를 실제 브라우저로 잽니다.`;

export const metadata: Metadata = {
  ...pageMetadata({ title: 'Taster 진단', description: DESCRIPTION, path: '/', preview: '이 화면은 얼마나 슬롭일까요' }),
  // Only here: the 404 screen gets Next's own noindex, and a robots line in the layout would contradict it.
  robots: { index: true, follow: true },
};

// The address a visitor diagnoses lives in the fragment (#url=), which only the browser reads, so this page never
// sees it and stays one static page.
export default function Page() {
  return <Diagnose ruleCount={RULE_COUNT} />;
}
