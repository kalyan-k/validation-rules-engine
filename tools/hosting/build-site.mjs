import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getSiteBasePath, prefixRootAbsolutePaths, withSiteBase } from './site-base-path.mjs';

const workspaceRoot = process.cwd();
const distRoot = path.join(workspaceRoot, 'dist');
const siteRoot = path.join(distRoot, 'site');
const siteBase = getSiteBasePath();

if (path.dirname(siteRoot) !== distRoot || path.basename(siteRoot) !== 'site') {
  throw new Error(`Refusing to rebuild an unexpected site directory: ${siteRoot}`);
}

const requiredDirectories = [
  path.join(workspaceRoot, 'apps', 'portal', 'public'),
  path.join(workspaceRoot, 'apps', 'docs', 'public'),
  path.join(workspaceRoot, 'tools', 'platform-shell'),
  path.join(distRoot, 'apps', 'docs'),
  path.join(distRoot, 'showcases', 'angular'),
  path.join(distRoot, 'showcases', 'react'),
  path.join(distRoot, 'showcases', 'vanilla')
];

for (const directory of requiredDirectories) {
  if (!existsSync(directory)) {
    throw new Error(`Required hosted application output is missing: ${directory}`);
  }
}

rmSync(siteRoot, { recursive: true, force: true });
mkdirSync(siteRoot, { recursive: true });

copyDirectory(path.join(workspaceRoot, 'apps', 'portal', 'public'), siteRoot);
copyDirectory(path.join(workspaceRoot, 'tools', 'platform-shell'), siteRoot);
copyDirectory(path.join(distRoot, 'showcases', 'angular'), path.join(siteRoot, 'showcases', 'angular'));
copyDirectory(path.join(distRoot, 'showcases', 'react'), path.join(siteRoot, 'showcases', 'react'));
copyDirectory(path.join(distRoot, 'showcases', 'vanilla'), path.join(siteRoot, 'showcases', 'vanilla'));
copyOptionalDirectory(
  path.join(workspaceRoot, 'docs', 'site', 'medium'),
  path.join(siteRoot, 'medium')
);

const docsRoot = path.join(siteRoot, 'docs');
mkdirSync(docsRoot, { recursive: true });
copyFile(path.join(workspaceRoot, 'apps', 'docs', 'public', 'styles.css'), path.join(docsRoot, 'styles.css'));
copyFile(path.join(workspaceRoot, 'apps', 'docs', 'public', 'search.js'), path.join(docsRoot, 'search.js'));

process.env.VRE_SINGLE_HOST = '1';
const documentationModuleUrl = `${pathToFileURL(path.join(distRoot, 'apps', 'docs', 'server.js')).href}?single-host=1`;
const { documentationSearchPayload, staticDocumentationPages } = await import(documentationModuleUrl);
const pages = staticDocumentationPages();

for (const page of pages) {
  const target = safeSitePath(page.path);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, page.html, 'utf8');
}

const overview = pages.find(({ path: pagePath }) => pagePath === 'docs/overview/index.html');
if (!overview) {
  throw new Error('The documentation catalog does not contain the overview page.');
}
writeFileSync(path.join(docsRoot, 'index.html'), overview.html, 'utf8');
writeFileSync(path.join(docsRoot, 'search-index.json'), `${JSON.stringify(documentationSearchPayload())}\n`, 'utf8');

const hostedReportsRoot = path.join(siteRoot, 'reports');
const preferHostedEvidence = process.env.VRE_HOSTED_EVIDENCE === '1';
const reportsSource = resolveEvidenceSource({
  liveRoot: path.join(workspaceRoot, 'reports'),
  evidenceRoot: path.join(workspaceRoot, 'hosted', 'evidence', 'reports'),
  marker: 'index.html',
  preferEvidence: preferHostedEvidence
});
if (reportsSource) {
  copyDirectory(reportsSource, hostedReportsRoot);
  injectPlatformConfig(hostedReportsRoot);
  console.log(`Included reports from ${path.relative(workspaceRoot, reportsSource)}`);
} else {
  writeEmptyReportsPlaceholder(hostedReportsRoot);
  console.log('No reports evidence found; wrote an empty /reports placeholder. Run npm run evidence:publish locally to ship coverage.');
}

const automationRoot = path.join(siteRoot, 'automation');
mkdirSync(automationRoot, { recursive: true });
copyFile(path.join(workspaceRoot, 'apps', 'portal', 'public', 'playwright.html'), path.join(automationRoot, 'index.html'));
const playwrightSource = resolveEvidenceSource({
  liveRoot: path.join(workspaceRoot, 'artifacts', 'playwright'),
  evidenceRoot: path.join(workspaceRoot, 'hosted', 'evidence', 'playwright'),
  marker: path.join('portal-data', 'latest-run.json'),
  fallbackMarkers: ['html-report', 'json', 'junit', 'catalog'],
  preferEvidence: preferHostedEvidence
});
if (playwrightSource) {
  copyDirectory(playwrightSource, path.join(automationRoot, 'artifacts'));
  console.log(`Included Playwright artifacts from ${path.relative(workspaceRoot, playwrightSource)}`);
} else {
  console.log('No Playwright evidence found; /automation will show an empty state until npm run evidence:publish.');
}

const securityRoot = path.join(siteRoot, 'security');
mkdirSync(securityRoot, { recursive: true });
copyFile(path.join(workspaceRoot, 'apps', 'portal', 'public', 'security.html'), path.join(securityRoot, 'index.html'));
const securitySource = resolveEvidenceSource({
  liveRoot: path.join(workspaceRoot, 'reports', 'security'),
  evidenceRoot: path.join(workspaceRoot, 'hosted', 'evidence', 'security'),
  marker: path.join('portal-data', 'latest.json'),
  fallbackMarkers: ['security-summary.json', 'latest.json', 'sbom'],
  preferEvidence: preferHostedEvidence
});
if (securitySource) {
  copyDirectory(securitySource, path.join(securityRoot, 'artifacts'));
  console.log(`Included security artifacts from ${path.relative(workspaceRoot, securitySource)}`);
} else {
  console.log('No security evidence found; /security will show an empty state until npm run evidence:publish.');
}

const publicBaseUrl = (process.env.VRE_PUBLIC_URL ?? '').replace(/\/$/, '');
const originBase = publicBaseUrl || siteBase;
const configuredUrls = {
  portal: originBase,
  docs: originBase,
  angular: `${originBase}/showcases/angular`,
  react: `${originBase}/showcases/react`,
  vanilla: `${originBase}/showcases/vanilla`
};
const contactFormEmbedUrl = String(process.env.VRE_CONTACT_FORM_URL ?? '').trim();
if (!contactFormEmbedUrl) {
  console.warn('VRE_CONTACT_FORM_URL is unset; Contact page will show the unconfigured state.');
} else if (!/^https:\/\/docs\.google\.com\/forms\//u.test(contactFormEmbedUrl)) {
  console.warn('VRE_CONTACT_FORM_URL is set but is not a https://docs.google.com/forms/... URL; Contact page will reject it.');
} else {
  console.log('VRE_CONTACT_FORM_URL will be embedded into platform-config.js for the Contact page.');
}
const platformConfigSource = [
  '// Generated by tools/hosting/build-site.mjs for same-origin production hosting.',
  '(() => {',
  `  const configured = ${JSON.stringify(configuredUrls)};`,
  `  const siteBase = ${JSON.stringify(siteBase)};`,
  `  const contactFormEmbedUrl = ${JSON.stringify(contactFormEmbedUrl)};`,
  "  const currentOrigin = globalThis.location?.origin ?? '';",
  "  const resolveUrl = (value) => {",
  "    if (!value) {",
  "      return siteBase ? new URL(siteBase + '/', currentOrigin + '/').href.replace(/\\/$/, '') : currentOrigin;",
  "    }",
  "    return new URL(value, currentOrigin + '/').href.replace(/\\/$/, '');",
  "  };",
  '  globalThis.vrePlatformConfig = globalThis.vrePlatformConfig || {',
  '    siteBase,',
  '    contactFormEmbedUrl,',
  '    features: { docsSearch: true },',
  '    urls: Object.fromEntries(Object.entries(configured).map(([key, value]) => [key, resolveUrl(value)]))',
  '  };',
  '})();',
  ''
].join('\n');

for (const configPath of [
  path.join(siteRoot, 'platform-config.js'),
  path.join(siteRoot, 'showcases', 'angular', 'platform-config.js'),
  path.join(siteRoot, 'showcases', 'react', 'platform-config.js'),
  path.join(siteRoot, 'showcases', 'vanilla', 'platform-config.js')
]) {
  writeFileSync(configPath, platformConfigSource, 'utf8');
}

const packageVersion = JSON.parse(readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8')).version;

writeFileSync(path.join(siteRoot, 'deployment-manifest.json'), `${JSON.stringify({
  version: packageVersion,
  siteBase: siteBase || '/',
  routes: {
    portal: withSiteBase('/', siteBase),
    documentation: withSiteBase('/docs/', siteBase),
    angularShowcase: withSiteBase('/showcases/angular/', siteBase),
    reactShowcase: withSiteBase('/showcases/react/', siteBase),
    vanillaShowcase: withSiteBase('/showcases/vanilla/', siteBase),
    reports: withSiteBase('/reports/', siteBase),
    automation: withSiteBase('/automation/', siteBase),
    security: withSiteBase('/security/', siteBase)
  }
}, null, 2)}\n`, 'utf8');

copyFile(
  path.join(workspaceRoot, 'tools', 'hosting', 'staticwebapp.config.json'),
  path.join(siteRoot, 'staticwebapp.config.json')
);

writeStaticHostingApis({
  version: packageVersion,
  urls: configuredUrls,
  publicBaseUrl: originBase
});

writeFileSync(path.join(siteRoot, '.nojekyll'), '');
copyFile(path.join(siteRoot, 'index.html'), path.join(siteRoot, '404.html'));

if (siteBase) {
  applySiteBasePathToTree(siteRoot, siteBase);
  console.log(`Applied site base path ${siteBase} for non-root hosts (e.g. GitHub Pages).`);
}

console.log(`Built the single-host site at ${siteRoot}`);
console.log(`Generated ${pages.length} documentation pages.`);
if (process.env.VRE_STATIC_WEB_APPS === '1' || process.env.VRE_HOSTED_EVIDENCE === '1') {
  console.log('Included Azure Static Web Apps config and static API stubs for SWA hosting.');
}

function applySiteBasePathToTree(root, base) {
  const textExtensions = new Set([
    '.css',
    '.html',
    '.js',
    '.json',
    '.map',
    '.svg',
    '.txt',
    '.webmanifest',
    '.xml'
  ]);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      applySiteBasePathToTree(target, base);
      continue;
    }
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }
    const content = readFileSync(target, 'utf8');
    const next = prefixRootAbsolutePaths(content, base);
    if (next !== content) {
      writeFileSync(target, next, 'utf8');
    }
  }
}

function safeSitePath(relativePath) {
  const resolved = path.resolve(siteRoot, relativePath);
  if (!resolved.startsWith(`${siteRoot}${path.sep}`)) {
    throw new Error(`Refusing to write outside the site directory: ${relativePath}`);
  }
  return resolved;
}

function copyDirectory(source, target) {
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
}

function copyOptionalDirectory(source, target) {
  if (existsSync(source)) {
    copyDirectory(source, target);
  }
}

function resolveEvidenceSource({ liveRoot, evidenceRoot, marker, fallbackMarkers = [], preferEvidence = false }) {
  const candidates = preferEvidence ? [evidenceRoot, liveRoot] : [liveRoot, evidenceRoot];
  for (const root of candidates) {
    if (!existsSync(root)) {
      continue;
    }
    if (existsSync(path.join(root, marker))) {
      return root;
    }
    if (fallbackMarkers.some((relativePath) => existsSync(path.join(root, relativePath)))) {
      return root;
    }
  }
  return null;
}

function writeEmptyReportsPlaceholder(targetRoot) {
  mkdirSync(targetRoot, { recursive: true });
  writeFileSync(
    path.join(targetRoot, 'index.html'),
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reports unavailable</title>
  <link rel="stylesheet" href="/platform-theme.css">
  <script src="/platform-config.js"></script>
  <script src="/platform-shell.js" defer></script>
</head>
<body>
  <validation-platform-shell active-application="reports"></validation-platform-shell>
  <main style="max-width:720px;margin:2rem auto;padding:0 1.25rem;font-family:Segoe UI,sans-serif;">
    <h1>Test reports are not published yet</h1>
    <p>Generate coverage locally, publish evidence, and commit <code>hosted/evidence</code>:</p>
    <pre style="padding:1rem;background:#f4f6f8;border-radius:8px;overflow:auto;">npm run test:ci
npm run test:e2e:chromium
npm run evidence:publish
git add hosted/evidence
git commit -m "Update hosted test and automation evidence"</pre>
  </main>
</body>
</html>
`,
    'utf8'
  );
}

function copyFile(source, target) {
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(source, target, { force: true });
}

function injectPlatformConfig(root) {
  if (!existsSync(root)) {
    return;
  }
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      injectPlatformConfig(target);
      continue;
    }
    if (!entry.isFile() || path.extname(entry.name) !== '.html') {
      continue;
    }
    const html = readFileSync(target, 'utf8');
    if (!html.includes('<validation-platform-shell') || html.includes('src="/platform-config.js"')) {
      continue;
    }
    // Build the tag without a contiguous "<script" literal next to file content variables.
    const platformConfigTag = ['<', 'script src="/platform-config.js"', '></', 'script>'].join('');
    writeFileSync(target, html.replace('<head>', `<head>\n  ${platformConfigTag}`), 'utf8');
  }
}

function writeJson(relativePath, data) {
  const target = safeSitePath(relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeStaticHostingApis({ version, urls, publicBaseUrl }) {
  const docsBase = publicBaseUrl || '';
  const applications = [
    {
      id: 'docs',
      title: 'Documentation',
      shortTitle: 'Docs',
      description: 'Concepts, guides, public APIs, architecture, testing, and migration guidance.',
      kind: 'documentation',
      url: `${docsBase}/docs/overview`,
      healthUrl: '/docs/health',
      startScript: 'serve:docs:portal',
      documentationUrl: `${docsBase}/docs/overview`,
      tags: ['Guides', 'API', 'Architecture'],
      state: 'healthy',
      detail: 'Served by the unified host'
    },
    {
      id: 'vanilla-showcase',
      title: 'Vanilla JS Showcase',
      shortTitle: 'Vanilla JS',
      description: 'Framework-free TypeScript forms that call @validation-rules-engine/core directly for simple, complex, and large-form validation.',
      kind: 'showcase',
      url: urls.vanilla,
      healthUrl: `${urls.vanilla}/health`,
      startScript: 'serve:static',
      documentationUrl: `${docsBase}/docs/core-package`,
      tags: ['TypeScript', 'Vite', 'Core API'],
      showcaseLinks: [
        ['Simple Form', 'simple'],
        ['Complex Form', 'complex'],
        ['Performance Form', 'performance']
      ].map(([label, slug]) => ({
        label,
        url: `${urls.vanilla}/${slug}`,
        documentationUrl: `${docsBase}/docs/core-examples`
      })),
      state: 'healthy',
      detail: 'Served by the unified host'
    },
    {
      id: 'angular-showcase',
      title: 'Angular Showcase',
      shortTitle: 'Angular',
      description: 'Angular validation showcases with UI framework examples and comparable state management implementations.',
      kind: 'showcase',
      url: urls.angular,
      healthUrl: `${urls.angular}/health`,
      startScript: 'serve:static',
      documentationUrl: `${docsBase}/docs/angular`,
      tags: ['ngModel', 'Reactive Forms', 'NgRx', 'NGXS', 'Signals'],
      showcaseLinks: [
        ['Template Driven', 'template-driven', 'angular-ngmodel'],
        ['Reactive Forms', 'reactive-forms', 'angular-reactive-forms'],
        ['NgRx', 'ngrx', 'angular-state-ngrx'],
        ['NGXS', 'ngxs', 'angular-state-ngxs'],
        ['Akita', 'akita', 'angular-state-akita'],
        ['Elf', 'elf', 'angular-state-elf'],
        ['RxAngular State', 'rx-angular-state', 'angular-state-rx-angular'],
        ['Signals', 'signals', 'angular-state-signals'],
        ['Custom RxJS Store', 'custom-rxjs-store', 'angular-state-custom-rxjs-store']
      ].map(([label, slug, docSlug]) => ({
        label,
        url: `${urls.angular}/state/${slug}`,
        documentationUrl: `${docsBase}/docs/${docSlug}`
      })),
      state: 'healthy',
      detail: 'Served by the unified host'
    },
    {
      id: 'react-showcase',
      title: 'React Showcase',
      shortTitle: 'React',
      description: 'Hooks-first controlled forms with nested policies, dynamic groups, accessibility, and measured large-form behavior.',
      kind: 'showcase',
      url: urls.react,
      healthUrl: `${urls.react}/health`,
      startScript: 'serve:static',
      documentationUrl: `${docsBase}/docs/react-overview`,
      tags: ['React', 'Hooks', 'Seven state integrations'],
      showcaseLinks: [
        ['Local State', 'local-state'],
        ['Redux Toolkit', 'redux-toolkit'],
        ['Zustand', 'zustand'],
        ['Jotai', 'jotai'],
        ['Recoil', 'recoil'],
        ['MobX', 'mobx'],
        ['Context API', 'context']
      ].map(([label, slug]) => ({
        label,
        url: `${urls.react}/state/${slug}`,
        documentationUrl: `${docsBase}/docs/react-state-${slug}`
      })),
      state: 'healthy',
      detail: 'Served by the unified host'
    }
  ];

  const revision = (process.env.GITHUB_SHA ?? process.env.VRE_REVISION ?? '').slice(0, 7) || 'local';
  const builtAt = process.env.VRE_BUILD_TIME ?? new Date().toISOString();

  writeJson('api/status.json', { applications });
  writeJson('api/meta.json', {
    version,
    revision,
    builtAt,
    repository: 'https://github.com/kalyan-k/validation-rules-engine',
    urls
  });
  writeJson('api/health.json', {
    status: 'healthy',
    service: 'portal',
    applications
  });
  writeJson('api/health-ready.json', {
    status: 'healthy',
    service: 'portal',
    applications
  });
  writeJson('api/docs-health.json', { status: 'healthy', service: 'documentation' });
  writeJson('api/angular-health.json', { status: 'healthy', service: 'angular-showcase' });
  writeJson('api/react-health.json', { status: 'healthy', service: 'react-showcase' });
  writeJson('api/vanilla-health.json', { status: 'healthy', service: 'vanilla-showcase' });

  const playwrightLatestCandidates = [
    path.join(workspaceRoot, 'artifacts', 'playwright', 'portal-data', 'latest-run.json'),
    path.join(workspaceRoot, 'hosted', 'evidence', 'playwright', 'portal-data', 'latest-run.json')
  ];
  const playwrightLatestSource = playwrightLatestCandidates.find((candidate) => existsSync(candidate));
  if (playwrightLatestSource) {
    copyFile(playwrightLatestSource, path.join(siteRoot, 'api', 'playwright', 'latest.json'));
  } else {
    writeJson('api/playwright/latest.json', {
      available: false,
      message: 'No Playwright report data is available yet. Publish local evidence with npm run evidence:publish.',
      command: 'npm run test:e2e:chromium && npm run evidence:publish'
    });
  }

  const securityLatestCandidates = [
    path.join(workspaceRoot, 'reports', 'security', 'portal-data', 'latest.json'),
    path.join(workspaceRoot, 'hosted', 'evidence', 'security', 'portal-data', 'latest.json')
  ];
  const securityLatestSource = securityLatestCandidates.find((candidate) => existsSync(candidate));
  if (securityLatestSource) {
    copyFile(securityLatestSource, path.join(siteRoot, 'api', 'security', 'latest.json'));
  } else {
    writeJson('api/security/latest.json', {
      available: false,
      message: 'No security report data is available yet. Publish local evidence with npm run evidence:publish.',
      command: 'npm run security:full && npm run evidence:publish',
      checks: [],
      packages: [
        '@validation-rules-engine/core',
        '@validation-rules-engine/angular',
        '@validation-rules-engine/react'
      ]
    });
  }
}
