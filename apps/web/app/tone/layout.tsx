import { StudioProvider } from '../components/studio';
import '../components/gallery.css';
import './tone.css';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <StudioProvider>{children}</StudioProvider>;
}
