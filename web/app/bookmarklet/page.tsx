import type { Metadata } from 'next';
import { BookmarkletLink } from './link';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://taster-six.vercel.app';

export const metadata: Metadata = {
  title: 'Taster 북마클릿과 확장',
  description: '보고 있는 페이지에서 바로 Taster 규칙을 재는 북마클릿과 브라우저 확장.',
  alternates: { canonical: '/bookmarklet' },
};

export default function Page() {
  return (
    <main className="page">
      <header className="masthead">
        <p className="wordmark">
          <a href="/">Taster</a>
        </p>
        <p className="tagline">보고 있는 페이지에서 바로 잽니다</p>
      </header>

      <section className="install" aria-labelledby="bm-title">
        <h1 id="bm-title">북마클릿</h1>
        <p>아래 링크를 북마크 막대로 끌어다 놓고, 재고 싶은 페이지에서 누르세요. 걸린 곳에 테두리가 생기고, 오른쪽 아래에 규칙 목록이 뜹니다. 잰 결과는 그 탭 안에만 있고 어디로도 보내지 않습니다.</p>
        <p>
          <BookmarkletLink origin={SITE} />
        </p>
        <p className="fineprint">외부 스크립트를 막는 사이트(보안 정책이 엄격한 곳)에서는 동작하지 않습니다. 그때는 아래 확장을 쓰세요.</p>
      </section>

      <section className="install" aria-labelledby="ext-title">
        <h2 id="ext-title">브라우저 확장</h2>
        <p>크롬과 엣지에서 쓰는 확장입니다. 도구 막대의 Taster 버튼을 누른 탭에서만 동작하고, 다른 사이트 권한은 요청하지 않습니다. 스토어에 올리기 전까지는 저장소의 extension 폴더를 직접 불러옵니다.</p>
        <ol className="steps">
          <li>저장소를 내려받습니다.</li>
          <li>chrome://extensions 에서 개발자 모드를 켭니다.</li>
          <li>압축해제된 확장 프로그램을 로드합니다를 누르고 extension 폴더를 고릅니다.</li>
        </ol>
      </section>

      <footer className="colophon">
        <p>
          북마클릿과 확장은 같은 검사기(rules/detect.js)를 넣습니다. <a href="https://github.com/makim-414/taster">GitHub 저장소</a>.
        </p>
      </footer>
    </main>
  );
}
