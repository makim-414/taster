import type { Metadata } from 'next';
import { CATALOG, FAMILIES, SURFACES } from '../../lib/catalog';
import { Gallery, type Card } from './gallery';

export const metadata: Metadata = {
  title: '부품 갤러리 · Taster',
  description: 'AI 티 없이 쓸 수 있는 React 부품을 내 브랜드로 입혀 보고, 실제로 눌러 보고, 나란히 비교합니다.',
  alternates: { canonical: '/components' },
};

export default function Page() {
  const cards: Card[] = CATALOG.map((c) => ({
    id: c.id,
    group: c.group,
    slug: c.slug,
    name: c.name,
    categoryName: c.categoryName,
    family: c.family,
    summary: c.summary,
    surfaces: c.surfaces,
    search: [c.id, c.name, c.categoryName, c.familyName, c.summary, ...c.uses, ...c.surfaces, ...c.patterns.map((p) => p.name)].join(' ').toLowerCase(),
  }));
  return <Gallery cards={cards} families={FAMILIES} surfaces={SURFACES} />;
}
