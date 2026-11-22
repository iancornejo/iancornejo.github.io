// @ts-check
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The Lab and Join pages stay out of the sitemap unless they're switched "on" in profile.yaml.
const { site = {} } = parse(readFileSync(new URL('./src/data/profile.yaml', import.meta.url), 'utf8'));
const hidden = ['/404', ...(site.lab_page === 'on' ? [] : ['/lab/']), ...(site.join_page === 'on' ? [] : ['/join/'])];

export default defineConfig({
  site: 'https://iancornejo.github.io',
  integrations: [sitemap({ filter: (page) => !hidden.some((h) => page.includes(h)) })],
});
