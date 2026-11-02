'use client';

// What the visitor is trying on: the theme, the brand tokens and the picked components. It lives in the address when a
// board is shared and in this browser otherwise, so moving between pages keeps it.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';
export type Look = { theme: Theme; tokens: Record<string, string> };
type Saved = { theme: Theme; brand: string | null; tokens: Record<string, string>; source: string | null; picks: string[] };
type Studio = Saved & {
  ready: boolean;
  look: Look;
  setTheme: (theme: Theme) => void;
  setBrand: (hex: string | null) => void;
  absorb: (tokens: Record<string, string>, source: string) => void;
  togglePick: (id: string) => void;
  clearPicks: () => void;
};

const KEY = 'taster-studio';
const EMPTY: Saved = { theme: 'dark', brand: null, tokens: {}, source: null, picks: [] };
export const MAX_PICKS = 6;
const Ctx = createContext<Studio | null>(null);

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
// Text on the brand color: white or near black, whichever reads better. Same choice as engine/brand.mjs.
export function textOn(hex: string): string {
  const l = luminance(hex);
  return (1.05 / (l + 0.05)) >= (l + 0.05) / (luminance('#111111') + 0.05) ? '#ffffff' : '#111111';
}
export function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Saved>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let next = EMPTY;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) next = { ...EMPTY, ...JSON.parse(raw) };
    } catch { /* storage blocked: the choices last for this page */ }
    // A shared address wins over what this browser remembered.
    const params = new URLSearchParams(location.search);
    const brand = params.get('brand');
    const theme = params.get('theme');
    if (brand && isHex(`#${brand.replace('#', '')}`)) {
      const hex = `#${brand.replace('#', '')}`;
      next = { ...next, brand: hex, tokens: { '--brand': hex, '--accent-fg': textOn(hex) }, source: null };
    }
    if (theme === 'light' || theme === 'dark') next = { ...next, theme };
    setState(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* see above */ }
  }, [state, ready]);

  const setTheme = useCallback((theme: Theme) => setState((s) => ({ ...s, theme })), []);
  const setBrand = useCallback((hex: string | null) => {
    setState((s) => (hex ? { ...s, brand: hex, source: null, tokens: { ...s.tokens, '--brand': hex, '--accent-fg': textOn(hex) } } : { ...s, brand: null, source: null, tokens: {} }));
  }, []);
  const absorb = useCallback((tokens: Record<string, string>, source: string) => {
    setState((s) => ({ ...s, tokens, source, brand: tokens['--brand'] || null }));
  }, []);
  const togglePick = useCallback((id: string) => {
    setState((s) => ({ ...s, picks: s.picks.includes(id) ? s.picks.filter((p) => p !== id) : s.picks.length >= MAX_PICKS ? s.picks : [...s.picks, id] }));
  }, []);
  const clearPicks = useCallback(() => setState((s) => ({ ...s, picks: [] })), []);

  const look = useMemo<Look>(() => ({ theme: state.theme, tokens: state.tokens }), [state.theme, state.tokens]);
  const value = useMemo(() => ({ ...state, ready, look, setTheme, setBrand, absorb, togglePick, clearPicks }), [state, ready, look, setTheme, setBrand, absorb, togglePick, clearPicks]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStudio(): Studio {
  const studio = useContext(Ctx);
  if (!studio) throw new Error('useStudio needs StudioProvider');
  return studio;
}

export const stageSrc = (id: string, look: Look) => `/stage/index.html?only=${encodeURIComponent(id)}&look=${encodeURIComponent(JSON.stringify(look))}`;

/** One component running live in a frame. The look changes without a reload. */
export function LiveFrame({ id, look, title, interactive = true, onHeight }: { id: string; look: Look; title: string; interactive?: boolean; onHeight?: (height: number) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  // The address is fixed at the first look; later changes go by message, so the component keeps its state.
  const [src] = useState(() => stageSrc(id, look));
  const send = useCallback(() => {
    frame.current?.contentWindow?.postMessage({ type: 'taster-look', look }, location.origin);
  }, [look]);
  useEffect(send, [send]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'taster-stage') return;
      onHeight?.(event.data.height);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [onHeight]);
  return (
    <iframe
      ref={frame}
      className="live-frame"
      src={src}
      title={title}
      onLoad={send}
      tabIndex={interactive ? undefined : -1}
      aria-hidden={interactive ? undefined : true}
      style={interactive ? undefined : { pointerEvents: 'none' }}
    />
  );
}
