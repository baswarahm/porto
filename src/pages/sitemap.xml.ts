/* Sitemap of every page, regenerated (with a fresh lastmod) on every build. */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const day = new Date().toISOString().slice(0, 10);
  const urls = [{ path: '/', priority: '1.0' }];   // one page
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${new URL(u.path, site).href}</loc>
    <lastmod>${day}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
