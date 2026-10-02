import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://domoscope.vercel.app';

// Static landing and documentation routes
const staticRoutes = [
  { path: '', priority: '1.0', changefreq: 'daily' },
  { path: 'setup', priority: '0.9', changefreq: 'weekly' }
];

// Curated high-traffic public repositories across diverse domains & languages
// Enables search engines to index rich architectural views & polyglot ERDs
const POPULAR_REPOSITORIES = [
  // Creator & Ecosystem
  { owner: 'DarkNecrocities', repo: 'DomoScope' },
  { owner: 'darknecrocities', repo: 'DomoDomo---All-in-one-Tool' },

  // Frontend & UI Frameworks
  { owner: 'facebook', repo: 'react' },
  { owner: 'vuejs', repo: 'core' },
  { owner: 'vercel', repo: 'next.js' },
  { owner: 'tailwindlabs', repo: 'tailwindcss' },
  { owner: 'shadcn-ui', repo: 'ui' },
  { owner: 'sveltejs', repo: 'svelte' },
  { owner: 'angular', repo: 'angular' },

  // Backend & APIs
  { owner: 'expressjs', repo: 'express' },
  { owner: 'fastapi', repo: 'fastapi' },
  { owner: 'nestjs', repo: 'nest' },
  { owner: 'django', repo: 'django' },
  { owner: 'pallets', repo: 'flask' },
  { owner: 'spring-projects', repo: 'spring-boot' },
  { owner: 'gin-gonic', repo: 'gin' },

  // Databases & ORMs
  { owner: 'prisma', repo: 'prisma' },
  { owner: 'drizzle-team', repo: 'drizzle-orm' },
  { owner: 'typeorm', repo: 'typeorm' },
  { owner: 'supabase', repo: 'supabase' },

  // AI & Agent Protocols
  { owner: 'modelcontextprotocol', repo: 'servers' },
  { owner: 'anthropics', repo: 'anthropic-quickstarts' },
  { owner: 'huggingface', repo: 'transformers' },
  { owner: 'ollama', repo: 'ollama' },
  { owner: 'mlc-ai', repo: 'web-llm' },

  // Tooling, Systems & Runtimes
  { owner: 'microsoft', repo: 'vscode' },
  { owner: 'denoland', repo: 'deno' },
  { owner: 'oven-sh', repo: 'bun' },
  { owner: 'torvalds', repo: 'linux' },
  { owner: 'golang', repo: 'go' }
];

// Key architectural tabs for deep indexed exploration
const WORKSPACE_TABS = [
  { id: 'architecture', priority: '0.8', changefreq: 'weekly' },
  { id: 'database', priority: '0.8', changefreq: 'weekly' },
  { id: 'api_catalog', priority: '0.8', changefreq: 'weekly' },
  { id: 'security', priority: '0.8', changefreq: 'weekly' },
  { id: 'reverse_engineer', priority: '0.8', changefreq: 'weekly' },
  { id: 'dependencies', priority: '0.8', changefreq: 'weekly' },
  { id: 'audit_report', priority: '0.8', changefreq: 'weekly' },
  { id: 'compare', priority: '0.7', changefreq: 'monthly' }
];

const today = new Date().toISOString().split('T')[0];

const sitemapEntries = [];

// 1. Add static routes
for (const route of staticRoutes) {
  const loc = route.path ? `${BASE_URL}/${route.path}` : `${BASE_URL}/`;
  sitemapEntries.push(`  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
}

// 2. Add repository base pages and deep feature tabs
for (const { owner, repo } of POPULAR_REPOSITORIES) {
  // Main repository workspace page
  sitemapEntries.push(`  <url>
    <loc>${BASE_URL}/repository/${owner}/${repo}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`);

  // Sub-tabs
  for (const tab of WORKSPACE_TABS) {
    sitemapEntries.push(`  <url>
    <loc>${BASE_URL}/repository/${owner}/${repo}/${tab.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${tab.changefreq}</changefreq>
    <priority>${tab.priority}</priority>
  </url>`);
  }
}

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>
`;

// Write to public/ folder (synced in source control)
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const publicSitemapPath = path.resolve(publicDir, 'sitemap.xml');
fs.writeFileSync(publicSitemapPath, sitemapXml, 'utf-8');
console.log(`✓ Synchronized sitemap generated at ${publicSitemapPath}`);

// Write to dist/ folder if it exists (for immediate preview / deployment builds)
const distDir = path.resolve('dist');
if (fs.existsSync(distDir)) {
  const distSitemapPath = path.resolve(distDir, 'sitemap.xml');
  fs.writeFileSync(distSitemapPath, sitemapXml, 'utf-8');
  console.log(`✓ Synchronized sitemap copied to ${distSitemapPath}`);
}

console.log(`[DomoScope Sitemap] Total indexed entries: ${sitemapEntries.length} (${staticRoutes.length} static routes, ${POPULAR_REPOSITORIES.length} repositories with ${WORKSPACE_TABS.length} deep architectural tabs each).`);
