import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import '../../../registry/src/tokens.css';
import '../../../registry/src/themes/light.css';
import './globals.css';
import { PREVIEW, SITE } from '../lib/page-meta';

// Defaults for a page that sets nothing, such as the 404 screen. Each page sets its own title, description, canonical
// address and preview (lib/page-meta.ts); the home page holds the site's description and its robots line.
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Taster',
  openGraph: { ...PREVIEW.openGraph, title: 'Taster' },
  twitter: { ...PREVIEW.twitter, title: 'Taster' },
};

// Noto Sans KR, latin slice, kept in app/fonts (OFL, see app/fonts/OFL.txt). The build used to fetch it from
// Google Fonts, which broke when Google changed its font URLs. globals.css points the --font token at it.
const sans = localFont({
  src: [
    { path: './fonts/noto-sans-kr-latin-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/noto-sans-kr-latin-500.woff2', weight: '500', style: 'normal' },
    { path: './fonts/noto-sans-kr-latin-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
  preload: false,
});

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="light" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
