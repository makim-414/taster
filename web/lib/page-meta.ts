// The head tags each page sets for itself: title, description, canonical address and the link preview (Open Graph and
// X). Next replaces a parent's openGraph and twitter as a whole, and a page that sets neither shows the home page's
// preview, so every page builds its own here. No JSON imports, so tests can load it with Node.
import type { Metadata } from 'next';

export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://taster-six.vercel.app';

// public/og.png comes from scripts/og/render.mjs.
const IMAGE = { url: '/og.png', width: 1200, height: 630, alt: 'Taster: 이 화면은 얼마나 슬롭일까요' };

/** The preview fields every page shares, for app/layout.tsx and the pages below. */
export const PREVIEW = {
  openGraph: { type: 'website', siteName: 'Taster', locale: 'ko_KR', images: [IMAGE] },
  twitter: { card: 'summary_large_image', images: [IMAGE.url] },
} satisfies Metadata;

/** One page's metadata. `preview` is the title on the link preview when it differs from the tab title. */
export function pageMetadata({ title, description, path, preview = title }: { title: string; description?: string; path: string; preview?: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...PREVIEW.openGraph, url: path, title: preview, description },
    twitter: { ...PREVIEW.twitter, title: preview, description },
  };
}
