import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CATALOG, langOf, sourceOf } from '../../../../lib/catalog';
import { addLine } from '../../../../lib/install';
import { pageMetadata } from '../../../../lib/page-meta';
import { CopyButton } from '../../copy-button';
import { Detail } from './detail';

type Params = { params: Promise<{ group: string; name: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return CATALOG.map((c) => ({ group: c.group, name: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { group, name } = await params;
  const item = CATALOG.find((c) => c.id === `${group}/${name}`);
  return pageMetadata({ title: item ? `${item.name} · Taster 부품` : 'Taster 부품', description: item?.summary || undefined, path: `/components/${group}/${name}` });
}

export default async function Page({ params }: Params) {
  const { group, name } = await params;
  const item = CATALOG.find((c) => c.id === `${group}/${name}`);
  if (!item) notFound();
  const source = sourceOf(item);
  return (
    <Detail id={item.id} name={item.name} kind={item.categoryName} kindLang={item.categoryLang} summary={item.summary} summaryLang={item.summaryLang} install={addLine(item.id)}>
      <div className="facts">
        {item.patterns.length > 0 && (
          <section>
            <h2>언제 쓰나요</h2>
            <ul>
              {item.patterns.map((p) => (
                <li key={p.id} lang={langOf(p.name + p.summary)}><a href={`https://github.com/makim-414/taster/blob/main/data/patterns/${p.id}.md`}>{p.name}</a><span>{p.summary}</span></li>
              ))}
            </ul>
          </section>
        )}
        {item.fixes.length > 0 && (
          <section>
            <h2>대신 없애 주는 AI 티</h2>
            <ul className="plain-list">{item.fixes.map((f) => <li key={f.id} lang={langOf(f.name)}>{f.name} ({f.id})</li>)}</ul>
          </section>
        )}
        <section>
          <h2>정보</h2>
          <dl className="meta">
            <div><dt>설치할 패키지</dt><dd>{['tailwindcss', ...item.deps].join(', ')}</dd></div>
            <div><dt>라이선스</dt><dd>{item.license || '표시 없음'}</dd></div>
            {item.credit && <div><dt>출처</dt><dd>{item.credit}</dd></div>}
          </dl>
        </section>
      </div>
      <details className="source">
        <summary>코드 보기</summary>
        <div className="source-tools"><CopyButton text={source} label="코드 복사" /></div>
        {/* It scrolls, so it takes keyboard focus to scroll without a mouse. */}
        <pre tabIndex={0} aria-label={`${item.name} 소스 코드`}><code>{source}</code></pre>
      </details>
    </Detail>
  );
}
