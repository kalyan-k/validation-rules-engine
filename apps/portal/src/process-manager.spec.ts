import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationDefinitions } from './applications.js';
import { ApplicationProcessManager } from './process-manager.js';

test('initializes every registered application in a stopped state', () => {
  const manager = new ApplicationProcessManager(applicationDefinitions, process.cwd(), '');
  const statuses = manager.getStatuses();
  assert.equal(statuses.length, 3);
  assert.deepEqual(statuses.map(({ id }) => id), [
    'docs',
    'angular-showcase',
    'react-showcase'
  ]);
  assert.ok(statuses.every(({ state }) => state === 'stopped'));
  const angular = statuses.find(({ id }) => id === 'angular-showcase');
  assert.deepEqual(angular?.showcaseLinks?.map(({ label }) => label), [
    'Template Driven', 'Reactive Forms', 'NgRx', 'NGXS', 'Akita', 'Elf',
    'RxAngular State', 'Signals', 'Custom RxJS Store'
  ]);
  const react = statuses.find(({ id }) => id === 'react-showcase');
  assert.deepEqual(react?.showcaseLinks?.map(({ label }) => label), [
    'Local State', 'Redux Toolkit', 'Zustand', 'Jotai', 'Recoil', 'MobX', 'Context API'
  ]);
  assert.ok(react?.showcaseLinks?.every(({ url, documentationUrl }) => url.includes('/state/') && documentationUrl.includes('/docs/react-state-')));
});

test('reports a useful failure when the portal is not launched through npm', () => {
  const manager = new ApplicationProcessManager(applicationDefinitions, process.cwd(), '');
  manager.startAll();
  assert.ok(manager.getStatuses().every(({ state }) => state === 'failed'));
});
