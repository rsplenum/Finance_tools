/**
 * The site map for search engines (MAP1): at the end of each build, `sitemap.xml` lists every page the build wrote, so a
 * new page joins it by itself, and `robots.txt` points to it. Both name the address in `site` (astro.config.mjs), the
 * pages.dev address until LAUNCH moves the site to its own domain. Crawling stays allowed: the `noindex` header
 * (site/public/_headers) keeps the pages out of search results until LAUNCH, and a crawler blocked by robots.txt would
 * never read that header. The 404 page is left out; the site check fails a built page missing from the map.
 */
import { writeFile } from 'node:fs/promises';

export const sitemapPaths = (pathnames) => [...new Set(pathnames.map((p) => `/${p}`.replace(/\/?$/, '/').replace(/^\/+/, '/')))]
  .filter((p) => p !== '/404/')
  .sort();

export default function sitemap() {
  let site;
  return {
    name: 'finsight-sitemap',
    hooks: {
      'astro:config:done': ({ config }) => { site = config.site?.replace(/\/$/, ''); },
      'astro:build:done': async ({ pages, dir }) => {
        if (!site) throw new Error('sitemap: set `site` in astro.config.mjs');
        const urls = sitemapPaths(pages.map((p) => p.pathname)).map((p) => `  <url><loc>${site}${p}</loc></url>`);
        await writeFile(new URL('sitemap.xml', dir), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
        await writeFile(new URL('robots.txt', dir), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
      },
    },
  };
}
