import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/page-meta';
import { CursorDemo, type Script } from './demo';
import './demo.css';

export const metadata: Metadata = pageMetadata({
  title: '에이전트 여럿이 다시 짓는 화면 · Taster',
  description:
    '가상의 서비스 Acme Ledger 예시 위에서 에이전트 여럿이 동시에 일합니다. 진단 에이전트는 실제 검사기로 규칙에 걸린 곳을 짚고, 재구성 에이전트는 다시 지은 페이지를 실제 DOM 의 레이어 순서대로 쌓고, 시스템 커서는 토큰을 움직여 페이지 전체를 한 번에 바꿉니다.',
  path: '/demo',
  preview: '진단, 재구성, 토큰: 에이전트 여럿이 다시 짓는 화면',
});

// The detector and the rule names the bookmarklet loads, from the pinned folder scripts/copy-fixtures.mjs writes
// (predev, prebuild), each with its sha384, so the frames run the same files a bookmark would. Read when the page is
// built: a build without them, or without the copied example, fails here instead of shipping a demo that cannot run.
function detectorFiles(): { detect: Script; rules: Script } {
  const pub = path.join(process.cwd(), 'public');
  const pinFile = path.join(pub, 'taster/bookmarklet.json');
  if (!existsSync(pinFile) || !existsSync(path.join(pub, 'examples/rebuild/before.html'))) {
    throw new Error('public/taster or public/examples is missing; run node scripts/copy-fixtures.mjs first');
  }
  const { version } = JSON.parse(readFileSync(pinFile, 'utf8')) as { version: string };
  const pinned = (name: string): Script => ({
    src: `/taster/${version}/${name}`,
    integrity: `sha384-${createHash('sha384').update(readFileSync(path.join(pub, 'taster', version, name))).digest('base64')}`,
  });
  return { detect: pinned('detect.js'), rules: pinned('rules.js') };
}

export default function Page() {
  const files = detectorFiles();
  return (
    <main className="page">
      <header className="masthead">
        <p className="wordmark">
          <a href="/">Taster</a>
        </p>
        <p className="tagline">진단하고, 다시 짓고, 토큰으로 맞춥니다</p>
      </header>

      <section className="demo-intro" aria-labelledby="demo-title">
        <h1 id="demo-title">에이전트 여럿이 나눠 다시 짓는 화면</h1>
        <p className="demo-lede">
          저장소의 examples/rebuild 에 있는 가상의 서비스 Acme Ledger 를 1300 폭 창에 띄웠습니다. 빨간 에이전트들은 검사기를 실제로 돌려
          걸린 곳을 짚고, 색이 다른 에이전트들은 다시 지은 페이지를 그 페이지의 실제 레이어 순서대로 나눠 쌓고, 시스템 커서는 토큰을
          움직여 페이지 전체를 한 번에 바꿉니다.
        </p>
      </section>

      <CursorDemo detect={files.detect} rules={files.rules} />

      <section className="demo-steps" aria-labelledby="steps-title">
        <h2 id="steps-title">화면에서 일어나는 일</h2>
        <ol className="steps">
          <li>
            <strong>진단.</strong> 고치기 전 페이지(before.html) 안에서 Taster 의 검사기를 1300 폭과 390 폭으로 돌립니다. 진단 에이전트
            몇이 동시에 걸린 요소로 날아가 테두리를 긋고 규칙 번호와 이름을 붙입니다. 390 폭에서만 걸리는 규칙은 따로 붙고, 찾은 규칙
            수가 올라갑니다.
          </li>
          <li>
            <strong>재구성.</strong> 다시 지은 페이지(after.html)의 DOM 을 위에서부터 읽어, 상자를 만드는 요소와 글줄 하나하나를 레이어로
            삼습니다. 레이어는 순서대로 비어 있는 에이전트에게 가고, 에이전트는 그 자리로 날아가 실제 크기(가로 x 세로)로 상자를 그린 뒤
            레이어를 드러내고 글은 타자로 칩니다. 아래 막대에 에이전트 수와 쌓은 레이어 수가 나옵니다.
          </li>
          <li>
            <strong>토큰.</strong> 다시 지은 페이지는 색, 간격, 모서리를 토큰으로만 읽습니다. 시스템 커서가 모서리와 간격 토큰을 움직이면
            페이지 전체가 한 번에 바뀌고, 다시 원래 값으로 돌아옵니다. 멈춘 뒤에는 두 막대를 직접 움직여 볼 수 있습니다.
          </li>
          <li>
            <strong>끝.</strong> 몇 에이전트가 몇 초 걸렸는지와, 다시 지은 페이지를 같은 검사기로 잰 규칙 수가 남습니다. 다시 지은 페이지를
            새 탭에서 열 수 있습니다.
          </li>
        </ol>
      </section>

      <footer className="colophon">
        <p>
          두 페이지와 둘을 검사하는 스크립트는 저장소의 examples/rebuild 에 있고, 검사기는 북마클릿이 넣는 것과 같은 data/rules/detect.js
          입니다. <a href="/">진단</a>, <a href="/components">부품 갤러리</a>, <a href="https://github.com/makim-414/taster">GitHub 저장소</a>.
        </p>
      </footer>
    </main>
  );
}
