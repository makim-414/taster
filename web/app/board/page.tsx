import type { Metadata } from 'next';
import { CATALOG } from '../../lib/catalog';
import { Board } from './board';

export const metadata: Metadata = {
  title: '나란히 비교 · Taster',
  description: '고른 부품을 내 브랜드로 입혀 나란히 놓고, 마음에 드는 것을 골라 에이전트에게 알려 줍니다.',
  robots: { index: false },
};

export default function Page() {
  return <Board items={CATALOG.map((c) => ({ id: c.id, name: c.name, group: c.group, slug: c.slug, categoryName: c.categoryName }))} />;
}
