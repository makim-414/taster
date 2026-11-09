import type { MetadataRoute } from 'next';
import { CATALOG } from '../lib/catalog';
import { SITE } from '../lib/page-meta.ts';

// /sitemap.xml: the pages a search engine should know, and every component's page from registry/registry.json.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/components', '/tone', '/bookmarklet', ...CATALOG.map((c) => `/components/${c.id}`)];
  return paths.map((path) => ({ url: new URL(path, SITE).href }));
}
