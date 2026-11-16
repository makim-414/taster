import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { pageMetadata } from '../../lib/page-meta';
import { CursorDemo, type Script } from './demo';
import './demo.css';

export const metadata: Metadata = pageMetadata({
  title: '세 커서로 보는 재구성 · Taster',
  description:
    '가상의 서비스 Acme Ledger 예시 위에서 커서 셋이 동시에 일합니다. 진단은 실제 검사기로 규칙에 걸린 곳을 짚고, 교체는 섹션마다 다시 지은 판으로 바꾸고, 시스템은 토큰을 움직여 판 전체를 한 번에 바꿉니다.',
  path: '/demo',
  preview: '진단, 교체, 시스템: 세 커서로 보는 재구성',
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
        <p className="tagline">진단, 교체, 시스템이 한 화면에서 같이 일합니다</p>
      </header>

      <section className="demo-intro" aria-labelledby="demo-title">
        <h1 id="demo-title">커서 셋이 나눠 고치는 화면</h1>
        <p className="demo-lede">
          저장소의 examples/rebuild 에 있는 가상의 서비스 Acme Ledger 를 1300 폭 첫 화면 그대로 띄웠습니다. 커서 하나는 검사기를 실제로
          돌려 걸린 곳을 짚고, 하나는 섹션마다 다시 지은 판으로 바꾸고, 하나는 토큰을 움직여 다시 지은 판 전체를 한 번에 바꿉니다.
        </p>
      </section>

      <CursorDemo detect={files.detect} rules={files.rules} />

      <section className="demo-steps" aria-labelledby="steps-title">
        <h2 id="steps-title">세 커서가 하는 일</h2>
        <ol className="steps">
          <li>
            <strong>진단.</strong> 고치기 전 페이지(before.html) 안에서 Taster 의 검사기를 돌려, 규칙에 걸린 요소를 하나씩 짚고 규칙
            번호와 이름을 붙입니다. 화면의 수는 이때 잰 값입니다.
          </li>
          <li>
            <strong>교체.</strong> 섹션마다 같은 내용을 토큰 부품으로 다시 지은 판(after.html)으로 바꿉니다. 바뀐 섹션의 규칙은 남은
            규칙에서 빠지고, 다 바꾼 판을 같은 검사기로 다시 잰 수가 마지막에 남습니다.
          </li>
          <li>
            <strong>시스템.</strong> 다시 지은 판은 색, 간격, 모서리를 토큰으로만 읽습니다. 모서리와 간격 토큰을 움직이면 판 전체가 한
            번에 바뀌고, 다시 원래 값으로 돌아옵니다. 멈춘 뒤에는 두 막대를 직접 움직여 볼 수 있습니다.
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
