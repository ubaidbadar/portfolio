// Sets the live URL everywhere it is needed. Run when the site moves to a different domain:
//   node scripts/set-site-url.mjs https://example.com/
// It swaps the current site URL (read from the canonical link) for the new one throughout index.html
// (canonical, social tags, structured data) and writes sitemap.xml and robots.txt. Safe to re-run.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const arg = process.argv[2];
if (!arg || !/^https:\/\//.test(arg)) { console.error('Usage: node scripts/set-site-url.mjs https://your-domain/'); process.exit(1); }
const site = new URL(arg.endsWith('/') ? arg : arg + '/').href;
const root = fileURLToPath(new URL('..', import.meta.url));
const file = root + 'index.html';
let html = readFileSync(file, 'utf8');

const current = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
if (!current) throw new Error('canonical link not found in index.html');
html = html.replaceAll(current, site);

// The structured data must still parse after the swap.
const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!ld) throw new Error('structured data block not found in index.html');
JSON.parse(ld[1]);
writeFileSync(file, html);

const lastmod = new Date().toISOString().slice(0, 10);
writeFileSync(root + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`);
writeFileSync(root + 'robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n`);
console.log(`Site URL set to ${site}\n- index.html: ${current} -> ${site}\n- sitemap.xml and robots.txt written`);
