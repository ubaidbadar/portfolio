// Sets the live URL everywhere it is needed. Run once you know where the site is hosted:
//   node scripts/set-site-url.mjs https://example.com/
// It rewrites the canonical link, absolute social-image URLs and structured-data URLs in index.html,
// and writes sitemap.xml and robots.txt. Safe to re-run with a different URL.
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const arg = process.argv[2];
if (!arg || !/^https:\/\//.test(arg)) { console.error('Usage: node scripts/set-site-url.mjs https://your-domain/'); process.exit(1); }
const site = new URL(arg.endsWith('/') ? arg : arg + '/').href;
const root = fileURLToPath(new URL('..', import.meta.url));
const file = root + 'index.html';
let html = readFileSync(file, 'utf8');

const block = `  <!-- site-url:start (rewritten by scripts/set-site-url.mjs) -->
  <link rel="canonical" href="${site}">
  <meta property="og:url" content="${site}">
  <meta property="og:image" content="${site}assets/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Ubaid Badar — full-stack and mobile engineer, technical lead">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Ubaid Badar — Full-Stack &amp; Mobile Developer">
  <meta name="twitter:description" content="6+ years, 750+ delivered orders, lead developer on four production platforms since 2019.">
  <meta name="twitter:image" content="${site}assets/og.jpg">
  <!-- site-url:end -->`;
const blockRe = /  <!-- site-url:start[\s\S]*?<!-- site-url:end -->/;
if (!blockRe.test(html)) throw new Error('site-url markers not found in index.html');
html = html.replace(blockRe, block);

const ldRe = /(<script type="application\/ld\+json" id="ld-profile">)([\s\S]*?)(<\/script>)/;
const m = html.match(ldRe);
if (!m) throw new Error('structured data block not found in index.html');
const ld = JSON.parse(m[2]);
ld['@id'] = site + '#profile';
ld.url = site;
ld.mainEntity['@id'] = site + '#person';
ld.mainEntity.url = site;
ld.mainEntity.image = site + 'assets/og.jpg';
html = html.replace(ldRe, `$1\n  ${JSON.stringify(ld, null, 2).replace(/\n/g, '\n  ')}\n  $3`);
writeFileSync(file, html);

// lastmod reflects when index.html was last actually changed
const lastmod = statSync(file).mtime.toISOString().slice(0, 10);
writeFileSync(root + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`);
writeFileSync(root + 'robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n`);
console.log(`Site URL set to ${site}\n- index.html: canonical, og:url, social image, structured data\n- sitemap.xml and robots.txt written`);
