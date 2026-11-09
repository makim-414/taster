'use client';
import { useEffect, useRef } from 'react';

// React refuses javascript: URLs in href, so the bookmarklet address is set on the element after mount. The bookmark
// holds the overlay's sha384 (apps/web/scripts/copy-fixtures.mjs), so it runs that exact file or nothing, and it sends
// no Referer, so the address of the page being measured stays in the tab.
export function BookmarkletLink({ origin, version, integrity }: { origin: string; version: string; integrity: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const src = `${origin}/taster/${version}/overlay.js`;
    const missing = `Taster: could not load the overlay. Get the current bookmarklet at ${origin}/bookmarklet`;
    const code = `javascript:(()=>{const s=document.createElement('script');s.integrity='${integrity}';s.crossOrigin='anonymous';s.referrerPolicy='no-referrer';s.onerror=()=>alert('${missing}');s.src='${src}';document.documentElement.appendChild(s)})()`;
    ref.current?.setAttribute('href', code);
  }, [origin, version, integrity]);
  return (
    <a ref={ref} className="bookmarklet" onClick={(e) => e.preventDefault()}>
      Taster 로 재기
    </a>
  );
}
