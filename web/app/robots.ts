import type { MetadataRoute } from 'next';
import { SITE } from '../lib/page-meta.ts';

// /robots.txt. Crawlers stay off the API routes, which open other sites in a browser (a crawler that runs the tone
// page's script would otherwise have the server open reference sites), and off the board, which shows only the picks
// in its address.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/board'] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
