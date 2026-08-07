import assert from 'node:assert/strict';
import test from 'node:test';
import { applicationDefinitions } from './applications.js';
import { ApplicationProcessManager } from './process-manager.js';

test('initializes every registered application in a stopped state', () => {
  const manager = new ApplicationProcessManager(applicationDefinitions, process.cwd(), '');
  const statuses = manager.getStatuses();
  assert.equal(statuses.length, 4);
  assert.deepEqual(statuses.map(({ id }) => id), [
    'docs',
    'vanilla-showcase',
    'angular-showcase',
    'react-showcase'
  ]);
  assert.ok(statuses.every(({ state }) => state === 'stopped'));
  const vanilla = statuses.find(({ id }) => id === 'vanilla-showcase');
  assert.deepEqual(vanilla?.showcaseLinks?.map(({ label }) => label), [
    'Simple Form', 'Complex Form', 'Performance Form'
  ]);
  assert.ok(vanilla?.showcaseLinks?.every(({ url }) => /\/(simple|complex|performance)$/u.test(url)));
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

test('marks embedded applications healthy without spawning child processes', async () => {
  const manager = new ApplicationProcessManager(applicationDefinitions, process.cwd(), '', true);
  manager.startAll();
  await manager.refreshHealth();
  assert.ok(manager.getStatuses().every(({ state, detail }) => state === 'healthy' && detail === 'Served by the unified host'));
});
