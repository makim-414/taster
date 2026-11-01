import Link from 'next/link';
import { StudioProvider } from './studio';
import './gallery.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <StudioProvider>
      <div className="page gallery-page">
        <header className="masthead">
          <p className="wordmark"><Link href="/">Taster</Link></p>
          <nav className="site-nav" aria-label="사이트">
            <Link href="/">진단</Link>
            <Link href="/components">부품</Link>
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </StudioProvider>
  );
}
