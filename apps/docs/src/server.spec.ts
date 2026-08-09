import assert from 'node:assert/strict';
import test from 'node:test';
import { documentationCatalog } from './catalog.js';
import { documentationSearchPayload, staticDocumentationPages } from './server.js';

test('pre-renders every catalog entry for the unified production host', () => {
  const pages = staticDocumentationPages();
  assert.equal(pages.length, documentationCatalog.length);
  assert.ok(pages.every(({ path, html }) => path.startsWith('docs/') && path.endsWith('/index.html') && html.includes('<!doctype html>')));
  assert.ok(pages.every(({ html }) => html.includes('href="/docs/styles.css"') && html.includes('src="/platform-shell.js')));
  assert.ok(
    pages.every(({ html }) => html.includes('vanilla-url=') && html.includes('angular-url=') && html.includes('react-url=')),
    'Documentation pages must expose showcase URLs to the platform shell (including vanilla).'
  );
});

test('includes Vanilla JS Showcase documentation pages', () => {
  assert.ok(documentationCatalog.some(({ slug, section }) => slug === 'vanilla-overview' && section === 'Vanilla JS Showcase'));
  assert.ok(documentationCatalog.some(({ slug }) => slug === 'vanilla-quick-start'));
  assert.ok(documentationCatalog.some(({ slug }) => slug === 'vanilla-examples'));
  assert.ok(documentationCatalog.some(({ slug, section }) => slug === 'angular-showcase-overview' && section === 'Angular Showcase'));
  assert.ok(documentationCatalog.some(({ slug, section }) => slug === 'react-showcase-overview' && section === 'React Showcase'));
  const pages = staticDocumentationPages();
  const vanillaOverview = pages.find(({ path }) => path === 'docs/vanilla-overview/index.html');
  assert.ok(vanillaOverview?.html.includes('Open Vanilla JS Showcase'));
});

test('places Vanilla JS Showcase after Core Package in documentation navigation order', () => {
  const sections = [...new Set(documentationCatalog.map(({ section }) => section))];
  const coreIndex = sections.indexOf('Core Package');
  const vanillaIndex = sections.indexOf('Vanilla JS Showcase');
  const angularIndex = sections.indexOf('Angular Package');
  assert.ok(coreIndex >= 0 && vanillaIndex >= 0 && angularIndex >= 0);
  assert.equal(vanillaIndex, coreIndex + 1);
  assert.ok(angularIndex > vanillaIndex);
});
