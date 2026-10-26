import { Diagnose } from './diagnose';

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string | string[] }> }) {
  const { url } = await searchParams;
  return <Diagnose initialUrl={typeof url === 'string' ? url.slice(0, 2048) : ''} />;
}
