import type { Metadata } from 'next';
import { Remix } from './remix';

export const metadata: Metadata = {
  title: 'Taster 오브 변형',
  description: '에이전트가 일하는 동안 보이는 점 오브를 내 제품에 맞게 바꾸고, 주소로 공유하고, 코드로 가져갑니다.',
  alternates: { canonical: '/orbs' },
};

export default function Page() {
  return <Remix />;
}
