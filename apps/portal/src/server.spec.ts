import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { applicationDefinitions, platformUrls } from './applications.js';
import { ApplicationProcessManager } from './process-manager.js';
import { createPortalServer } from './server.js';

test('serves an executable browser runtime configuration', async () => {
  const manager = new ApplicationProcessManager(applicationDefinitions, process.cwd(), '', true);
  const server = createPortalServer(manager);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const origin = `http://127.0.0.1:${address.port}`;
    const response = await fetch(`${origin}/platform-config.js`);
    assert.equal(response.status, 200);
    const context = { URL, location: { origin } } as {
      URL: typeof URL;
      location: { origin: string };
      vrePlatformConfig?: { siteBase?: string; urls?: Record<string, string> };
    };
    runInNewContext(await response.text(), context);
    const expectedUrls = Object.fromEntries(Object.entries(platformUrls).map(([key, value]) => [
      key,
      value ? new URL(value, `${origin}/`).href.replace(/\/$/, '') : origin
    ]));
    assert.equal(context.vrePlatformConfig?.siteBase, '');
    assert.deepEqual({ ...context.vrePlatformConfig?.urls }, expectedUrls);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
