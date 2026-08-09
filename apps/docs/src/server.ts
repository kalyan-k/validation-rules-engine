import { createReadStream, readFileSync } from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { documentationCatalog, documentationEntry, type DocumentationEntry } from './catalog.js';
import { renderMarkdown } from './markdown.js';
import { buildSearchIndex, searchDocumentation } from './search.js';

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(sourceDirectory, '..', '..', '..');
const contentRoot = path.join(workspaceRoot, 'docs', 'site');
const publicRoot = path.join(workspaceRoot, 'apps', 'docs', 'public');
const shellRoot = path.join(workspaceRoot, 'tools', 'platform-shell');
const singleHost = process.env['VRE_SINGLE_HOST'] === '1' || process.argv.includes('--single-host');
const docsPort = configuredPort('VRE_DOCS_PORT', 4201);
const docsUrl = singleHost ? '' : configuredBaseUrl('VRE_DOCS_URL', `http://127.0.0.1:${docsPort}`);
const portalUrl = singleHost ? '' : configuredBaseUrl('VRE_PORTAL_URL', 'http://127.0.0.1:4200');
const angularShowcaseUrl = singleHost ? '/showcases/angular' : configuredBaseUrl('VRE_ANGULAR_SHOWCASE_URL', 'http://127.0.0.1:4202');
const reactShowcaseUrl = singleHost ? '/showcases/react' : configuredBaseUrl('VRE_REACT_SHOWCASE_URL', 'http://127.0.0.1:4204');
const vanillaShowcaseUrl = singleHost ? '/showcases/vanilla' : configuredBaseUrl('VRE_VANILLA_SHOWCASE_URL', 'http://127.0.0.1:4205');
const workspacePackage = JSON.parse(readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8')) as { version?: string };
const assetVersion = encodeURIComponent(workspacePackage.version ?? '1.0.0');
const platformAssets = new Set([
  'favicon.ico', 'platform-shell.css', 'platform-shell.js', 'platform-theme.css', 'site.webmanifest',
  'vre-mark.svg',
  ...[16, 32, 64, 180, 192, 512].map((size) => `vre-icon-${size}.png`)
]);
const platformContentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json'
};
const documentationSearchIndex = buildSearchIndex(
  documentationCatalog,
  (entry) => readFileSync(path.join(contentRoot, entry.source), 'utf8')
);

export function createDocumentationServer(): http.Server {
  return http.createServer((request, response) => handleRequest(request, response));
}

export interface StaticDocumentationPage {
  path: string;
  html: string;
}

export function staticDocumentationPages(): StaticDocumentationPage[] {
  return documentationCatalog.map((entry) => ({
    path: `docs/${entry.slug}/index.html`,
    html: renderDocumentationEntry(entry)
  }));
}

export function documentationSearchPayload(): { documents: typeof documentationSearchIndex } {
  return { documents: documentationSearchIndex };
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
  if (requestUrl.pathname === '/health' || requestUrl.pathname === '/docs/health') {
    sendJson(response, 200, { status: 'healthy', service: 'documentation' });
    return;
  }
  if (requestUrl.pathname === '/api/search' || requestUrl.pathname === '/docs/api/search') {
    // Allow the shared platform shell to query docs search from portal/showcase origins in multi-host mode.
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    sendJson(response, 200, { results: searchDocumentation(documentationSearchIndex, requestUrl.searchParams.get('q') ?? '') });
    return;
  }
  if (requestUrl.pathname === '/search-index.json' || requestUrl.pathname === '/docs/search-index.json') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    sendJson(response, 200, { documents: documentationSearchIndex });
    return;
  }
  if (requestUrl.pathname === '/search.js' || requestUrl.pathname === '/docs/search.js') {
    response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    createReadStream(path.join(publicRoot, 'search.js')).pipe(response);
    return;
  }
  if (requestUrl.pathname === '/styles.css' || requestUrl.pathname === '/docs/styles.css') {
    response.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'no-store' });
    createReadStream(path.join(publicRoot, 'styles.css')).pipe(response);
    return;
  }
  if (requestUrl.pathname === '/platform-config.js') {
    sendJavaScript(response, platformConfigScript());
    return;
  }
  if (platformAssets.has(requestUrl.pathname.slice(1))) {
    response.writeHead(200, {
      'Content-Type': platformContentTypes[path.extname(requestUrl.pathname)] ?? 'application/octet-stream',
      'Cache-Control': requestUrl.pathname === '/platform-shell.js' ? 'no-store' : 'public, max-age=3600'
    });
    createReadStream(path.join(shellRoot, requestUrl.pathname.slice(1))).pipe(response);
    return;
  }
  if (requestUrl.pathname === '/' || requestUrl.pathname === '/docs' || requestUrl.pathname === '/docs/') {
    response.writeHead(302, { Location: '/docs/overview' });
    response.end();
    return;
  }
  const match = /^\/docs\/([a-z0-9-]+)$/.exec(requestUrl.pathname);
  const entry = match?.[1] ? documentationEntry(match[1]) : undefined;
  if (!entry) {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(renderPage(undefined, '<h1>Page not found</h1><p>Choose a documentation topic from the navigation.</p>'));
    return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(renderDocumentationEntry(entry));
}

function renderDocumentationEntry(entry: DocumentationEntry): string {
  const markdown = readFileSync(path.join(contentRoot, entry.source), 'utf8');
  return renderPage(entry, rewriteConfiguredLinks(renderMarkdown(markdown)));
}

function renderPage(entry: DocumentationEntry | undefined, content: string): string {
  const currentIndex = entry ? documentationCatalog.indexOf(entry) : -1;
  const previous = currentIndex > 0 ? documentationCatalog[currentIndex - 1] : undefined;
  const next = currentIndex >= 0 && currentIndex < documentationCatalog.length - 1 ? documentationCatalog[currentIndex + 1] : undefined;
  const groupedNavigation = [...new Set(documentationCatalog.map(({ section }) => section))].map((section) => {
    const sectionEntries = documentationCatalog.filter((item) => item.section === section);
    return `
    <section class="nav-section"><h2>${escapeHtml(section)}</h2>${renderNavigationItems(sectionEntries, entry)}</section>
  `;
  }).join('');
  const showcaseLinks = entry?.section === 'React Package' || entry?.section === 'React Showcase' || entry?.slug.startsWith('react-')
    ? `<a class="showcase-link" href="${reactShowcaseUrl}${entry?.showcasePath ?? ''}"><strong>Open React Showcase</strong><span>Try the hooks and policies in a live React application &rarr;</span></a>`
    : entry?.section === 'Vanilla JS Showcase' || entry?.section === 'Core Package'
    ? `<a class="showcase-link" href="${vanillaShowcaseUrl}${entry?.showcasePath ?? ''}"><strong>Open Vanilla JS Showcase</strong><span>Run the same Core policies with framework-free TypeScript forms &rarr;</span></a><a class="showcase-link" href="${platformHref(portalUrl)}"><strong>Open Portal</strong><span>Launch documentation and every showcase from one place &rarr;</span></a>`
    : entry?.section === 'Introduction'
    ? `<a class="showcase-link" href="${platformHref(portalUrl)}"><strong>Open Portal</strong><span>Launch documentation and every showcase from one place &rarr;</span></a><a class="showcase-link" href="${vanillaShowcaseUrl}/"><strong>Open Vanilla JS Showcase</strong><span>See Core policies without Angular or React adapters &rarr;</span></a><a class="showcase-link" href="${angularShowcaseUrl}/"><strong>Open Angular Showcase</strong><span>Explore Angular forms and state integrations &rarr;</span></a><a class="showcase-link" href="${reactShowcaseUrl}/"><strong>Open React Showcase</strong><span>Explore React hooks and state integrations &rarr;</span></a>`
    : entry?.section === 'Angular Package' || entry?.section === 'Angular Showcase'
    ? `<a class="showcase-link" href="${angularShowcaseUrl}${entry?.showcasePath ?? ''}"><strong>Open Angular Showcase</strong><span>See the concepts running in a real application &rarr;</span></a>`
    : `<a class="showcase-link" href="${platformHref(portalUrl)}"><strong>Open Portal</strong><span>Launch documentation and every showcase from one place &rarr;</span></a><a class="showcase-link" href="${vanillaShowcaseUrl}/"><strong>Open Vanilla JS Showcase</strong><span>Core policies without framework adapters &rarr;</span></a><a class="showcase-link" href="${angularShowcaseUrl}/"><strong>Open Angular Showcase</strong><span>Angular forms and state integrations &rarr;</span></a><a class="showcase-link" href="${reactShowcaseUrl}/"><strong>Open React Showcase</strong><span>React hooks and state integrations &rarr;</span></a>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(entry?.summary ?? 'Validation Rules Engine documentation')}"><meta name="theme-color" content="#10243e"><title>${escapeHtml(entry?.title ?? 'Not found')} &middot; Validation Rules Engine</title><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/vre-mark.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/vre-icon-180.png"><link rel="manifest" href="/site.webmanifest"><link rel="preload" href="/platform-shell.css" as="style"><link rel="stylesheet" href="/platform-shell.css"><link rel="stylesheet" href="/platform-theme.css"><link rel="stylesheet" href="/docs/styles.css"><script src="/platform-config.js?v=${assetVersion}"></script><script src="/platform-shell.js?v=${assetVersion}"></script></head>
  <body><validation-platform-shell active-application="documentation" application-name="Documentation" version="${escapeHtml(workspacePackage.version ?? '1.0.0')}" portal-url="${portalUrl}" docs-url="${docsUrl}" angular-url="${angularShowcaseUrl}" react-url="${reactShowcaseUrl}" vanilla-url="${vanillaShowcaseUrl}">
  <div class="docs-layout"><aside><div class="docs-navigation">${groupedNavigation}</div></aside>
  <main><div class="vr-breadcrumb"><a href="${platformHref(portalUrl)}">Home</a><span>/</span><a href="/docs/overview">Documentation</a><span>/</span><span>${escapeHtml(entry?.section ?? 'Documentation')}</span></div><article id="docs-content">${content}</article>
  ${entry ? `<section class="live-example"><p>Continue in the live platform</p>${showcaseLinks}</section>` : ''}
  <nav class="pager" aria-label="Documentation pages">${previous ? `<a href="/docs/${previous.slug}"><small>Previous</small><strong>&larr; ${escapeHtml(previous.title)}</strong></a>` : '<span></span>'}${next ? `<a class="next" href="/docs/${next.slug}"><small>Next</small><strong>${escapeHtml(next.title)} &rarr;</strong></a>` : ''}</nav></main>
  <aside class="on-page"><strong>On this page</strong><p>${escapeHtml(entry?.summary ?? '')}</p><a href="${platformHref(portalUrl)}">Back to Portal &rarr;</a><a href="${platformHref(portalUrl, '/reports/')}">Test reports &rarr;</a></aside></div>
  </validation-platform-shell></body></html>`;
}

function renderNavigationItems(items: DocumentationEntry[], activeEntry: DocumentationEntry | undefined): string {
  const content: string[] = [];
  let index = 0;

  while (index < items.length) {
    const item = items[index];
    if (!item) {
      index += 1;
      continue;
    }

    if (item.navGroup) {
      const groupName = item.navGroup;
      const groupItems: DocumentationEntry[] = [];
      while (items[index]?.navGroup === groupName) {
        groupItems.push(items[index] as DocumentationEntry);
        index += 1;
      }
      const isActiveGroup = groupItems.some((groupItem) => groupItem === activeEntry);
      content.push(`<details class="nav-subsection"${isActiveGroup ? ' open' : ''}><summary>${escapeHtml(groupName)}</summary><div>${groupItems.map((groupItem) => renderNavigationLink(groupItem, activeEntry)).join('')}</div></details>`);
      continue;
    }

    content.push(renderNavigationLink(item, activeEntry));
    index += 1;
  }

  return content.join('');
}

function renderNavigationLink(item: DocumentationEntry, activeEntry: DocumentationEntry | undefined): string {
  const active = item === activeEntry;
  return `<a data-search="${escapeHtml(`${item.title} ${item.summary}`.toLowerCase())}" class="${active ? 'active' : ''}"${active ? ' aria-current="page"' : ''} href="/docs/${item.slug}">${escapeHtml(item.title)}</a>`;
}

function configuredValue(names: string | string[]): string | undefined {
  const candidates = Array.isArray(names) ? names : [names];
  return candidates.map((name) => process.env[name]).find((value): value is string => Boolean(value));
}

function configuredPort(names: string | string[], fallback: number): number {
  const value = Number.parseInt(configuredValue(names) ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function configuredBaseUrl(names: string | string[], fallback: string): string {
  return (configuredValue(names) ?? fallback).replace(/\/$/, '');
}

function platformHref(baseUrl: string, pathname = ''): string {
  return `${baseUrl}${pathname}` || '/';
}

function rewriteConfiguredLinks(html: string): string {
  return html
    .replaceAll('http://127.0.0.1:4200', portalUrl)
    .replaceAll('http://127.0.0.1:4201', docsUrl)
    .replaceAll('http://127.0.0.1:4202', angularShowcaseUrl)
    .replaceAll('http://127.0.0.1:4203', angularShowcaseUrl)
    .replaceAll('http://127.0.0.1:4204', reactShowcaseUrl)
    .replaceAll('http://127.0.0.1:4205', vanillaShowcaseUrl);
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function sendJavaScript(response: ServerResponse, value: string): void {
  response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(value);
}

function platformConfigScript(): string {
  return `globalThis.vrePlatformConfig = ${JSON.stringify({
    siteBase: '',
    contactFormEmbedUrl: String(process.env['VRE_CONTACT_FORM_URL'] ?? '').trim(),
    features: { docsSearch: true },
    urls: {
      portal: portalUrl,
      docs: docsUrl,
      angular: angularShowcaseUrl,
      react: reactShowcaseUrl,
      vanilla: vanillaShowcaseUrl
    }
  })};`;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createDocumentationServer().listen(docsPort, '127.0.0.1', () => {
    console.log(`Validation Rules Engine Documentation: ${docsUrl}`);
  });
}
