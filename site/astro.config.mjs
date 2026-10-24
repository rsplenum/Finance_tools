// Static site (D-TECH-01): Astro pages, Preact islands, Tailwind. Built to site/dist for Cloudflare Pages.
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import sitemap from './sitemap.mjs';

export default defineConfig({
  output: 'static',
  // The address the site map names (MAP1); LAUNCH changes it to the site's own domain.
  site: 'https://finance-tools-9if.pages.dev',
  integrations: [preact(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
