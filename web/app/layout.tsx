import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import '../../registry/src/tokens.css';
import '../../registry/src/themes/light.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Taster 진단',
  description: '주소를 넣으면 AI 가 만든 화면에서 자주 보이는 흔적을 실제 브라우저로 잽니다.',
  robots: { index: true, follow: true },
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
