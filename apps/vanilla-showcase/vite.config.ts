import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import { getSiteBasePath, withSiteBase } from '../../tools/hosting/site-base-path.mjs';

const workspaceRoot = resolve(__dirname, '../..');
const reportsRoot = resolve(workspaceRoot, 'reports/showcases/vanilla');

export default defineConfig(({ mode }) => {
  const testing = mode === 'test';
  const hosted = mode === 'single-host';
  const siteBase = getSiteBasePath();
  return {
    root: __dirname,
    base: hosted ? withSiteBase('/showcases/vanilla/', siteBase) : '/',
    publicDir: resolve(__dirname, '../../tools/platform-shell'),
    resolve: {
      alias: {
        '@validation-rules-engine/core': testing
          ? resolve(__dirname, '../../packages/core/src/public-api.ts')
          : resolve(__dirname, '../../dist/packages/core/fesm2022/validation-rules-engine-core.mjs')
      }
    },
    build: {
      outDir: resolve(__dirname, '../../dist/showcases/vanilla'),
      emptyOutDir: true,
      sourcemap: true
    },
    server: { host: '127.0.0.1', port: 4205 },
    test: {
      environment: 'jsdom',
      setupFiles: [resolve(__dirname, 'src/testing.ts')],
      include: ['src/**/*.spec.ts'],
      testTimeout: 30_000,
      reporters: ['default', 'json', 'junit'],
      outputFile: {
        json: resolve(reportsRoot, 'tests/results.json'),
        junit: resolve(reportsRoot, 'junit/test-results.xml')
      },
      coverage: {
        provider: 'v8',
        reportsDirectory: resolve(reportsRoot, 'coverage'),
        reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/testing.ts', 'src/vite-env.d.ts', 'src/validation/types.ts'],
        thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 }
      }
    }
  };
});
