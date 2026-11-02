'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { isHex, useStudio, type Theme } from './studio';

const THEMES: { id: Theme; label: string }[] = [{ id: 'dark', label: '어둡게' }, { id: 'light', label: '밝게' }];

/** The controls for trying a brand on: theme, color, and a site address to read the brand from. */
export function LookBar() {
  const { theme, brand, source, setTheme, setBrand, absorb } = useStudio();
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [state, setState] = useState<{ kind: 'idle' | 'loading' | 'error' | 'done'; message?: string }>({ kind: 'idle' });
  const shown = text || brand || '';
  // On a phone this stays folded so the components come first. Wider screens have room to show it open.
  const [wide, setWide] = useState(false);
  useEffect(() => setWide(matchMedia('(min-width: 768px)').matches), []);

  async function read(event: FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/api/brand', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) });
      const data = await res.json();
      if (!res.ok) return setState({ kind: 'error', message: data.error?.message || '브랜드를 읽지 못했습니다.' });
      absorb(data.tokens, url.trim());
      setText('');
      setState({ kind: 'done', message: data.tokens['--brand'] ? `${data.tokens['--brand']} 를 입혔습니다.` : '버튼에 쓰는 단색을 찾지 못해 글꼴만 입혔습니다. 색을 직접 골라 주세요.' });
    } catch {
      setState({ kind: 'error', message: '브랜드를 읽지 못했습니다. 잠시 뒤에 다시 해 주세요.' });
    }
  }

  return (
    <section className="lookbar" aria-label="내 브랜드 입혀 보기">
      <div className="lookbar-row">
        <div className="seg" role="group" aria-label="테마">
          {THEMES.map((t) => (
            <button key={t.id} type="button" className="seg-item" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</button>
          ))}
        </div>
        <label className="color-field">
          <span>브랜드 색</span>
          <input type="color" value={isHex(shown) ? shown : '#888888'} onChange={(e) => { setText(''); setBrand(e.target.value); }} />
          <input
            type="text"
            inputMode="text"
            spellCheck={false}
            placeholder="#2563eb"
            aria-label="브랜드 색 값"
            value={shown}
            onChange={(e) => {
              const value = e.target.value.trim();
              setText(value);
              if (isHex(value)) setBrand(value);
            }}
            onBlur={() => setText('')}
          />
        </label>
        {brand && <button type="button" className="text-button" onClick={() => { setText(''); setBrand(null); setState({ kind: 'idle' }); }}>원래대로</button>}
      </div>
      <details className="absorb" open={wide || undefined} key={String(wide)}>
        <summary>내 사이트에서 가져오기</summary>
        <form className="lookbar-row" onSubmit={read}>
          <label className="url-field">
            <span className="visually-hidden">사이트 주소</span>
            <input type="text" inputMode="url" placeholder="example.com" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <button type="submit" className="button" disabled={state.kind === 'loading' || !url.trim()}>{state.kind === 'loading' ? '읽는 중' : '브랜드 읽기'}</button>
        </form>
      </details>
      <p className="lookbar-note" role="status">
        {state.kind === 'loading' ? '사이트를 열어 버튼 색과 글꼴을 읽고 있습니다.' : state.message || (source ? `${source} 의 브랜드를 입혔습니다.` : brand ? '모든 부품이 이 색으로 움직입니다. 눌러서 써 보세요.' : '색을 고르면 아래 부품이 그 색으로 바뀝니다.')}
      </p>
    </section>
  );
}
