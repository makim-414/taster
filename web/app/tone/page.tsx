import type { Metadata } from 'next';
import { Tone } from './tone';

export const metadata: Metadata = {
  title: '톤 고르기 · Taster',
  description: '상업성과 브랜드 개성, 미니멀과 화려 사이에 점을 놓으면 가까운 실제 사이트와, 그 위치의 토큰으로 그린 Taster 부품을 보여 줍니다.',
  alternates: { canonical: '/tone' },
};

export default function Page() {
  return <Tone />;
}
