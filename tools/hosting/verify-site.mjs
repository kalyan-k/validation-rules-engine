import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const workspaceRoot = process.cwd();
const siteRoot = path.join(workspaceRoot, 'dist', 'site');

for (const relativePath of [
  'index.html',
  'deployment-manifest.json',
  'staticwebapp.config.json',
  'api/status.json',
  'api/meta.json',
  'api/playwright/latest.json',
  'docs/overview/index.html',
  'docs/search-index.json',
  'showcases/angular/index.html',
  'showcases/react/index.html',
  'showcases/vanilla/index.html',
  'automation/index.html',
  'contact/index.html',
  'contact.js'
]) {
  assert.ok(existsSync(path.join(siteRoot, relativePath)), `Missing hosted output: ${relativePath}`);
}

const staticStatus = JSON.parse(readFileSync(path.join(siteRoot, 'api', 'status.json'), 'utf8'));
assert.equal(staticStatus.applications.length, 4);
assert.ok(staticStatus.applications.every(({ state }) => state === 'healthy'));
const staticWebAppConfig = readFileSync(path.join(siteRoot, 'staticwebapp.config.json'), 'utf8');
assert.match(staticWebAppConfig, /"rewrite": "\/showcases\/vanilla\/index\.html"/u);
assert.doesNotMatch(
  staticWebAppConfig,
  /"route": "\/showcases\/angular"[\s\S]*"route": "\/showcases\/angular\/"/u,
  'Azure Static Web Apps rejects duplicate /showcases/angular and /showcases/angular/ routes'
);
assert.doesNotMatch(
  staticWebAppConfig,
  /"route": "\/showcases\/angular\/\*"/u,
  'Use explicit Angular SPA path prefixes instead of /showcases/angular/* which collides with /showcases/angular/'
);
assert.doesNotMatch(
  staticWebAppConfig,
  /"route": "\/showcases\/react\/\*"/u,
  'Do not rewrite /showcases/react/*; Azure would serve index.html for CSS/JS assets'
);
assert.doesNotMatch(
  staticWebAppConfig,
  /"route": "\/showcases\/vanilla\/\*"/u,
  'Do not rewrite /showcases/vanilla/*; Azure would serve index.html for CSS/JS assets'
);
assert.match(staticWebAppConfig, /"route": "\/showcases\/react\/state\/\*"/u);
assert.match(staticWebAppConfig, /"route": "\/showcases\/vanilla\/simple"/u);

const manifest = JSON.parse(readFileSync(path.join(siteRoot, 'deployment-manifest.json'), 'utf8'));
assert.equal(manifest.siteBase, '/');
assert.deepEqual(manifest.routes, {
  portal: '/',
  documentation: '/docs/',
  angularShowcase: '/showcases/angular/',
  reactShowcase: '/showcases/react/',
  vanillaShowcase: '/showcases/vanilla/',
  reports: '/reports/',
  automation: '/automation/'
});

const portalIndex = readFileSync(path.join(siteRoot, 'index.html'), 'utf8');
assert.doesNotMatch(portalIndex, /http:\/\/127\.0\.0\.1:42(?:00|01|02|03|04|05)/u);
assert.match(portalIndex, /href="\/platform-shell\.css"/u);
assert.doesNotMatch(portalIndex, /\/validation-rules-engine\//u);

const angularIndex = readFileSync(path.join(siteRoot, 'showcases', 'angular', 'index.html'), 'utf8');
assert.match(angularIndex, /<base href="\/showcases\/angular\/">/u);
const reactIndex = readFileSync(path.join(siteRoot, 'showcases', 'react', 'index.html'), 'utf8');
assert.match(reactIndex, /\/showcases\/react\/assets\//u);
const vanillaIndex = readFileSync(path.join(siteRoot, 'showcases', 'vanilla', 'index.html'), 'utf8');
assert.match(vanillaIndex, /\/showcases\/vanilla\/assets\//u);
const docsIndex = readFileSync(path.join(siteRoot, 'docs', 'overview', 'index.html'), 'utf8');
assert.match(docsIndex, /href="\/docs\/styles\.css"/u);
assert.doesNotMatch(docsIndex, /127\.0\.0\.1/u);

const rootPlatformConfig = readFileSync(path.join(siteRoot, 'platform-config.js'), 'utf8');
assert.match(rootPlatformConfig, /const siteBase = "";/u);
assert.match(rootPlatformConfig, /\.replace\(\/\\\/\$\/,\s*''\)/u);
assert.doesNotMatch(rootPlatformConfig, /validation-rules-engine/u);
assert.equal(
  readFileSync(path.join(siteRoot, 'showcases', 'angular', 'platform-config.js'), 'utf8'),
  rootPlatformConfig
);
assert.equal(
  readFileSync(path.join(siteRoot, 'showcases', 'react', 'platform-config.js'), 'utf8'),
  rootPlatformConfig
);
assert.equal(
  readFileSync(path.join(siteRoot, 'showcases', 'vanilla', 'platform-config.js'), 'utf8'),
  rootPlatformConfig
);
const shellDom = new JSDOM('<!doctype html><body></body>', {
  runScripts: 'dangerously',
  url: 'https://validation-rules-engine.azurewebsites.net/showcases/react/state/local-state'
});
shellDom.window.fetch = async () => ({
  ok: true,
  json: async () => ({ documents: [] })
});
shellDom.window.eval(rootPlatformConfig);
shellDom.window.eval(readFileSync(path.join(siteRoot, 'platform-shell.js'), 'utf8'));
const shell = shellDom.window.document.createElement('validation-platform-shell');
shell.setAttribute('active-application', 'react-showcase');
shellDom.window.document.body.append(shell);
assert.equal(
  shell.shadowRoot.querySelector('.platform-docs-dropdown a')?.getAttribute('href'),
  'https://validation-rules-engine.azurewebsites.net/docs/overview'
);
assert.equal(
  shell.shadowRoot.querySelector('.platform-footer-columns a')?.getAttribute('href'),
  'https://validation-rules-engine.azurewebsites.net/'
);
assert.ok(
  [...shell.shadowRoot.querySelectorAll('.platform-footer-columns a')]
    .some((link) => link.getAttribute('href') === 'https://validation-rules-engine.azurewebsites.net/docs/overview')
);
const showcaseLinks = [...shell.shadowRoot.querySelectorAll('.platform-nav-group')][1]
  .querySelectorAll('a');
assert.deepEqual([...showcaseLinks].map((link) => link.getAttribute('href')), [
  'https://validation-rules-engine.azurewebsites.net/showcases/vanilla/',
  'https://validation-rules-engine.azurewebsites.net/showcases/angular/',
  'https://validation-rules-engine.azurewebsites.net/showcases/react/'
]);
shellDom.window.close();

// GitHub Pages docs pages set root-relative angular/react/vanilla-url attributes.
// Those must resolve under the project base path, not the github.io domain root.
const pagesShellDom = new JSDOM('<!doctype html><body></body>', {
  runScripts: 'dangerously',
  url: 'https://kalyan-k.github.io/validation-rules-engine/docs/overview'
});
pagesShellDom.window.fetch = async () => ({
  ok: true,
  json: async () => ({ documents: [] })
});
pagesShellDom.window.eval(`globalThis.vrePlatformConfig = {
  siteBase: '/validation-rules-engine',
  urls: {
    portal: 'https://kalyan-k.github.io/validation-rules-engine',
    docs: 'https://kalyan-k.github.io/validation-rules-engine',
    angular: 'https://kalyan-k.github.io/validation-rules-engine/showcases/angular',
    react: 'https://kalyan-k.github.io/validation-rules-engine/showcases/react',
    vanilla: 'https://kalyan-k.github.io/validation-rules-engine/showcases/vanilla'
  }
};`);
pagesShellDom.window.eval(readFileSync(path.join(siteRoot, 'platform-shell.js'), 'utf8'));
const pagesShell = pagesShellDom.window.document.createElement('validation-platform-shell');
pagesShell.setAttribute('active-application', 'documentation');
pagesShell.setAttribute('angular-url', '/showcases/angular');
pagesShell.setAttribute('react-url', '/showcases/react');
pagesShell.setAttribute('vanilla-url', '/showcases/vanilla');
pagesShellDom.window.document.body.append(pagesShell);
const pagesShowcaseLinks = [...pagesShell.shadowRoot.querySelectorAll('.platform-nav-group')][1]
  .querySelectorAll('a');
assert.deepEqual([...pagesShowcaseLinks].map((link) => link.getAttribute('href')), [
  '/validation-rules-engine/showcases/vanilla/',
  '/validation-rules-engine/showcases/angular/',
  '/validation-rules-engine/showcases/react/'
]);
pagesShellDom.window.close();

const reportsIndexPath = path.join(siteRoot, 'reports', 'index.html');
if (existsSync(reportsIndexPath)) {
  assert.match(readFileSync(reportsIndexPath, 'utf8'), /<script src="\/platform-config\.js"><\/script>/u);
}

process.env.VRE_SINGLE_HOST = '1';
process.env.VRE_NO_OPEN = '1';
const [{ applicationDefinitions }, { ApplicationProcessManager }, { createPortalServer }] = await Promise.all([
  import('../../dist/apps/portal/applications.js?site-verification=1'),
  import('../../dist/apps/portal/process-manager.js?site-verification=1'),
  import('../../dist/apps/portal/server.js?site-verification=1')
]);
const manager = new ApplicationProcessManager(applicationDefinitions, workspaceRoot, '', true);
const server = createPortalServer(manager);

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

try {
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const origin = `http://127.0.0.1:${address.port}`;
  const routes = [
    '/',
    '/docs/overview',
    '/showcases/angular/state/akita',
    '/showcases/react/state/redux-toolkit',
    '/showcases/vanilla/simple',
    '/showcases/angular/platform-config.js',
    '/showcases/react/platform-config.js',
    '/showcases/vanilla/platform-config.js',
    '/reports/',
    '/automation/',
    '/contact/',
    '/health',
    '/health/ready'
  ];
  for (const route of routes) {
    const response = await fetch(`${origin}${route}`, { redirect: 'follow' });
    assert.equal(response.status, 200, `${route} returned ${response.status}`);
  }

  const portalHtml = await (await fetch(origin)).text();
  assert.doesNotMatch(portalHtml, /http:\/\/127\.0\.0\.1:42(?:00|01|02|03|04|05)/u);
  const runtimeConfigDom = new JSDOM('<!doctype html>', { runScripts: 'dangerously', url: origin });
  runtimeConfigDom.window.eval(await (await fetch(`${origin}/platform-config.js`)).text());
  assert.equal(runtimeConfigDom.window.vrePlatformConfig.siteBase, '');
  assert.deepEqual({ ...runtimeConfigDom.window.vrePlatformConfig.urls }, {
    portal: origin,
    docs: origin,
    angular: `${origin}/showcases/angular`,
    react: `${origin}/showcases/react`,
    vanilla: `${origin}/showcases/vanilla`
  });
  runtimeConfigDom.window.close();
  const status = await (await fetch(`${origin}/api/status`)).json();
  assert.equal(status.applications.length, 4);
  assert.ok(status.applications.every(({ state }) => state === 'healthy'));
  const statusJson = await (await fetch(`${origin}/api/status.json`)).json();
  assert.equal(statusJson.applications.length, 4);
  const metaJson = await (await fetch(`${origin}/api/meta.json`)).json();
  assert.ok(metaJson.version);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('Verified the single-origin production host and all public application routes.');
