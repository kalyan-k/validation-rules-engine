import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(__dirname, '../..');
const reportsRoot = resolve(workspaceRoot, 'reports/showcases/react');

export default defineConfig(({ mode }) => {
  const testing = mode === 'test';
  const hosted = mode === 'single-host';
  return {
    root: __dirname,
    base: hosted ? '/showcases/react/' : '/',
    publicDir: resolve(__dirname, '../../tools/platform-shell'),
    plugins: [react()],
    resolve: {
      alias: {
        '@validation-rules-engine/react': testing
          ? resolve(__dirname, '../../packages/react/src/index.ts')
          : resolve(__dirname, '../../dist/packages/react/index.js'),
        '@validation-rules-engine/core': testing
          ? resolve(__dirname, '../../packages/core/src/public-api.ts')
          : resolve(__dirname, '../../dist/packages/core/fesm2022/validation-rules-engine-core.mjs')
      }
    },
  build: {
    outDir: resolve(__dirname, '../../dist/showcases/react'),
    emptyOutDir: true,
    sourcemap: true
  },
  server: { host: '127.0.0.1', port: 4204 },
    test: {
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'src/testing.ts')],
    include: ['src/**/*.spec.{ts,tsx}'],
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
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/main.tsx', 'src/testing.ts', 'src/vite-env.d.ts'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 }
    }
    }
  };
});
