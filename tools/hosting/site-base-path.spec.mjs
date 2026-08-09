import assert from 'node:assert/strict';
import { getSiteBasePath, prefixRootAbsolutePaths, withSiteBase } from './site-base-path.mjs';

assert.equal(getSiteBasePath({}), '');
assert.equal(getSiteBasePath({ VRE_SITE_BASE_PATH: '/' }), '');
assert.equal(getSiteBasePath({ VRE_SITE_BASE_PATH: 'validation-rules-engine' }), '/validation-rules-engine');
assert.equal(getSiteBasePath({ VRE_SITE_BASE_PATH: '/validation-rules-engine/' }), '/validation-rules-engine');

assert.equal(withSiteBase('/', '/validation-rules-engine'), '/validation-rules-engine/');
assert.equal(withSiteBase('/docs/', '/validation-rules-engine'), '/validation-rules-engine/docs/');
assert.equal(withSiteBase('/docs/', ''), '/docs/');
assert.equal(
  withSiteBase('/validation-rules-engine/docs/', '/validation-rules-engine'),
  '/validation-rules-engine/docs/'
);

assert.equal(
  prefixRootAbsolutePaths('href="/platform-shell.css"', '/validation-rules-engine'),
  'href="/validation-rules-engine/platform-shell.css"'
);
assert.equal(
  prefixRootAbsolutePaths('href="/validation-rules-engine/platform-shell.css"', '/validation-rules-engine'),
  'href="/validation-rules-engine/platform-shell.css"'
);
assert.equal(
  prefixRootAbsolutePaths("url(/assets/x.png)", '/repo'),
  'url(/repo/assets/x.png)'
);
assert.equal(
  prefixRootAbsolutePaths('https://example.com/path', '/repo'),
  'https://example.com/path'
);

// Must not corrupt JavaScript regex literals (GitHub Pages blank-page bug).
assert.equal(
  prefixRootAbsolutePaths(".replace(/\\/$/, '')", '/validation-rules-engine'),
  ".replace(/\\/$/, '')"
);
assert.equal(
  prefixRootAbsolutePaths('/^https?:$/u.test(location.protocol)', '/validation-rules-engine'),
  '/^https?:$/u.test(location.protocol)'
);
assert.equal(
  prefixRootAbsolutePaths('angular-url="/showcases/angular"', '/validation-rules-engine'),
  'angular-url="/validation-rules-engine/showcases/angular"'
);
assert.equal(
  prefixRootAbsolutePaths('vanilla-url="/showcases/vanilla"', '/validation-rules-engine'),
  'vanilla-url="/validation-rules-engine/showcases/vanilla"'
);

// Empty/unset base path must be a no-op (Azure SWA, local single/multi-host).
const rootHostSample = 'href="/platform-shell.css"; .replace(/\\/$/, ""); /^https?:$/u;';
assert.equal(prefixRootAbsolutePaths(rootHostSample, ''), rootHostSample);
assert.equal(prefixRootAbsolutePaths(rootHostSample, getSiteBasePath({})), rootHostSample);
assert.equal(withSiteBase('/showcases/react/', ''), '/showcases/react/');
assert.equal(withSiteBase('/showcases/react/', getSiteBasePath({})), '/showcases/react/');

console.log('site-base-path helper checks passed.');
