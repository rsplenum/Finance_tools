// Static site (D-TECH-01): Astro pages, Preact islands, Tailwind. Built to site/dist for Cloudflare Pages.
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  integrations: [preact()],
  vite: { plugins: [tailwindcss()] },
});
