/* One-page sitemap, regenerated (with a fresh lastmod) on every build. */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const url = new URL('/', site).href;
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
