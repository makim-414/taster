import type { Metadata } from 'next';
import Link from 'next/link';
import './not-found.css';

// Every address the site does not have, and a component id that is not in the registry. Next adds its own noindex
// robots tag to a 404 answer, so this page sets no robots line of its own.
export const metadata: Metadata = { title: '찾는 페이지가 없습니다 · Taster' };

export default function NotFound() {
  return (
    <main className="page">
      <header className="masthead">
        <p className="wordmark">
          <Link href="/">Taster</Link>
        </p>
        <p className="tagline">AI 가 만든 웹 화면의 흔적을 잽니다</p>
      </header>

      <section className="not-found" aria-labelledby="nf-title">
        <h1 id="nf-title">찾는 페이지가 없습니다</h1>
        <p>주소가 바뀌었거나, 그런 이름의 부품이 없습니다. 아래에서 다시 시작하세요.</p>
        <ul className="steps">
          <li>
            <Link href="/">진단: 주소를 넣고 AI 티를 잽니다</Link>
          </li>
          <li>
            <Link href="/components">부품 갤러리: 같은 일을 하는 부품을 골라 봅니다</Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
