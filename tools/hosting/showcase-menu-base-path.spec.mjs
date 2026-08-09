import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const shellSource = readFileSync(new URL('../../tools/platform-shell/platform-shell.js', import.meta.url), 'utf8');

function showcaseHrefs(siteBase, pageUrl) {
  const dom = new JSDOM('<!doctype html><body></body>', {
    runScripts: 'dangerously',
    url: pageUrl
  });
  dom.window.eval(`globalThis.vrePlatformConfig = ${JSON.stringify({
    siteBase,
    urls: {
      portal: siteBase ? `https://kalyan-k.github.io${siteBase}` : '',
      docs: siteBase ? `https://kalyan-k.github.io${siteBase}` : '',
      angular: siteBase ? `https://kalyan-k.github.io${siteBase}/showcases/angular` : '/showcases/angular',
      react: siteBase ? `https://kalyan-k.github.io${siteBase}/showcases/react` : '/showcases/react',
      vanilla: siteBase ? `https://kalyan-k.github.io${siteBase}/showcases/vanilla` : '/showcases/vanilla'
    }
  })};`);
  dom.window.eval(shellSource);
  const shell = dom.window.document.createElement('validation-platform-shell');
  shell.setAttribute('active-application', 'documentation');
  shell.setAttribute('angular-url', '/showcases/angular');
  shell.setAttribute('react-url', '/showcases/react');
  shell.setAttribute('vanilla-url', '/showcases/vanilla');
  dom.window.document.body.append(shell);
  const hrefs = [...shell.shadowRoot.querySelectorAll('.platform-nav-group')][1]
    .querySelectorAll('a');
  const values = [...hrefs].map((link) => link.getAttribute('href'));
  dom.window.close();
  return values;
}

assert.deepEqual(
  showcaseHrefs('/validation-rules-engine', 'https://kalyan-k.github.io/validation-rules-engine/docs/overview'),
  [
    '/validation-rules-engine/showcases/vanilla/',
    '/validation-rules-engine/showcases/angular/',
    '/validation-rules-engine/showcases/react/'
  ]
);

assert.deepEqual(
  showcaseHrefs('', 'https://example.com/docs/overview'),
  ['/showcases/vanilla/', '/showcases/angular/', '/showcases/react/']
);

console.log('showcase menu URLs ok for GH Pages and root hosts');
