import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import '../../registry/src/tokens.css';
import '../../registry/src/themes/light.css';
import './globals.css';
import { RULE_COUNT } from '../lib/rule-count';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://taster-six.vercel.app';
const DESCRIPTION = `주소를 넣으면 1440 폭과 390 폭으로 열어, AI 가 만든 화면에서 자주 보이는 흔적 ${RULE_COUNT}가지를 실제 브라우저로 잽니다.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Taster 진단',
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  // The link preview LinkedIn, X and messengers show. public/og.png comes from scripts/og/render.mjs.
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Taster',
    title: '이 화면은 얼마나 슬롭일까요',
    description: DESCRIPTION,
    locale: 'ko_KR',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Taster: 이 화면은 얼마나 슬롭일까요' }],
  },
  twitter: { card: 'summary_large_image', title: '이 화면은 얼마나 슬롭일까요', description: DESCRIPTION, images: ['/og.png'] },
};

// Self-hosted at build time by next/font. globals.css points the --font token at it.
const sans = Noto_Sans_KR({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-sans', display: 'swap', preload: false });

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="light" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
