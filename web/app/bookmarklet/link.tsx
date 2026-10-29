'use client';
import { useEffect, useRef } from 'react';

// React refuses javascript: URLs in href, so the bookmarklet address is set on the element after mount.
export function BookmarkletLink({ origin }: { origin: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const src = `${origin}/taster/overlay.js`;
    const code = `javascript:(()=>{const s=document.createElement('script');s.src='${src}?t='+Date.now();document.documentElement.appendChild(s)})()`;
    ref.current?.setAttribute('href', code);
  }, [origin]);
  return (
    <a ref={ref} className="bookmarklet" onClick={(e) => e.preventDefault()}>
      Taster 로 재기
    </a>
  );
}
