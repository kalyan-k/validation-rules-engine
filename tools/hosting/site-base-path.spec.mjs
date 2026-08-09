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

console.log('site-base-path helper checks passed.');
