'use client';

import { useState } from 'react';

export function CopyButton({ text, label = '복사', className = 'button-quiet' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch { /* the text stays on screen to select by hand */ }
      }}
    >
      {done ? '복사됨' : label}
    </button>
  );
}
