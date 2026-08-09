import assert from 'node:assert/strict';
import test from 'node:test';
import { documentationCatalog } from './catalog.js';
import { documentationSearchPayload, staticDocumentationPages } from './server.js';

test('pre-renders every catalog entry for the unified production host', () => {
  const pages = staticDocumentationPages();
  assert.equal(pages.length, documentationCatalog.length);
  assert.ok(pages.every(({ path, html }) => path.startsWith('docs/') && path.endsWith('/index.html') && html.includes('<!doctype html>')));
  assert.ok(pages.every(({ html }) => html.includes('href="/docs/styles.css"') && html.includes('src="/docs/search.js')));
  assert.ok(
    pages.every(({ html }) => html.includes('vanilla-url=') && html.includes('angular-url=') && html.includes('react-url=')),
    'Documentation pages must expose showcase URLs to the platform shell (including vanilla).'
  );
});

test('exports the browser search payload used by the static documentation site', () => {
  const payload = documentationSearchPayload();
  assert.ok(payload.documents.length > documentationCatalog.length);
  assert.ok(payload.documents.some(({ slug }) => slug === 'overview'));
});
