import assert from 'node:assert/strict';
import test from 'node:test';
import type { DocumentationEntry } from './catalog.js';
import { documentationCatalog } from './catalog.js';
import { buildSearchIndex, searchDocumentation } from './search.js';

const entry: DocumentationEntry = {
  slug: 'policies', title: 'Policies', section: 'Guides', summary: 'Reusable policy rules.', source: 'policies.md'
};
const index = buildSearchIndex([entry], () => '# Policies\n\n## Async validation\n\nUse `validateAll()` with an observable.');

test('indexes page titles, headings, prose, and code snippets', () => {
  assert.equal(index.length, 2);
  assert.equal(searchDocumentation(index, 'Policies')[0]?.slug, 'policies');
  assert.equal(searchDocumentation(index, 'Async validation')[0]?.anchor, 'async-validation');
  assert.equal(searchDocumentation(index, 'validateAll')[0]?.anchor, 'async-validation');
});

test('requires every query term and returns section deep links', () => {
  const results = searchDocumentation(index, 'observable validation');
  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, 'policies:async-validation');
  assert.equal(searchDocumentation(index, 'missing concept').length, 0);
});

test('indexes React pages and deep-links to hook headings', () => {
  const reactEntry: DocumentationEntry = {
    slug: 'react-hooks', title: 'Core Hooks', section: 'React Package',
    summary: 'React validation hooks.', source: 'react-hooks.md'
  };
  const reactIndex = buildSearchIndex([reactEntry], () => '# Core Hooks\n\n## useValidationField\n\nFocused field errors and native input props.');
  const result = searchDocumentation(reactIndex, 'useValidationField native input')[0];
  assert.equal(result?.slug, 'react-hooks');
  assert.equal(result?.anchor, 'usevalidationfield');
});

test('catalogs every React state integration with a live showcase route', () => {
  const stateEntries = documentationCatalog.filter(({ slug }) => slug.startsWith('react-state-'));
  assert.deepEqual(stateEntries.map(({ title }) => title), [
    'Local State', 'Redux Toolkit', 'Zustand', 'Jotai',
    'Recoil', 'MobX', 'Context API'
  ]);
  assert.ok(stateEntries.every(({ showcasePath }) => showcasePath?.startsWith('/state/')));
});

test('catalogs package documentation sections for Core, Angular, and React', () => {
  const sections = new Set(documentationCatalog.map(({ section }) => section));
  assert.ok(sections.has('Core Package'));
  assert.ok(sections.has('Angular Package'));
  assert.ok(sections.has('React Package'));
  assert.ok(documentationCatalog.some(({ slug }) => slug === 'core-validation-rules'));
  assert.ok(documentationCatalog.some(({ slug }) => slug === 'angular-reactive-forms'));
  assert.ok(documentationCatalog.some(({ slug }) => slug === 'react-best-practices'));
});

test('indexes the full product name and VRE abbreviation', () => {
  const overview = documentationCatalog.find(({ slug }) => slug === 'overview');
  assert.ok(overview);
  const brandingIndex = buildSearchIndex([overview], () => '# Validation Rules Engine (VRE)\n\nPolicy-driven validation.');
  assert.equal(searchDocumentation(brandingIndex, 'Validation Rules Engine')[0]?.slug, 'overview');
  assert.equal(searchDocumentation(brandingIndex, 'VRE')[0]?.slug, 'overview');
});

test('indexes package docs for Core, Angular, and React search results', () => {
  const packageEntries: DocumentationEntry[] = [
    { slug: 'core-validation-rules', title: 'Validation Rules', section: 'Core Package', summary: 'Built-in rule behavior.', source: 'core-validation-rules.md' },
    { slug: 'angular-reactive-forms', title: 'Reactive Forms', section: 'Angular Package', summary: 'Coordinate Reactive Forms and policy validation.', source: 'angular-reactive-forms.md' },
    { slug: 'react-state-redux-toolkit', title: 'Redux Toolkit', section: 'React Package', summary: 'Slices and selectors.', source: 'react-state-redux-toolkit.md' }
  ];
  const packageIndex = buildSearchIndex(packageEntries, (candidate) => ({
    'core-validation-rules': '# Core Validation Rules\n\n## Custom rules\n\nUse `userDefined` for domain validation.',
    'angular-reactive-forms': '# Reactive Forms\n\n## Coordination pattern\n\nMap policyValidation errors back to controls.',
    'react-state-redux-toolkit': '# Redux Toolkit\n\n## Provider setup\n\nUse configureStore and react-redux Provider.'
  })[candidate.slug] ?? '');

  assert.equal(searchDocumentation(packageIndex, 'core userDefined')[0]?.slug, 'core-validation-rules');
  assert.equal(searchDocumentation(packageIndex, 'angular policyValidation controls')[0]?.slug, 'angular-reactive-forms');
  assert.equal(searchDocumentation(packageIndex, 'react redux provider')[0]?.slug, 'react-state-redux-toolkit');
});
