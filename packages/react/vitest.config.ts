import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(__dirname, '../..');
const reportsRoot = resolve(workspaceRoot, 'reports/packages/react');

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: { alias: { '@validation-rules/core': resolve(__dirname, '../core/src/public-api.ts') } },
  test: {
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'src/testing/setup.ts')],
    include: ['src/**/*.spec.{ts,tsx}'],
    testTimeout: 30_000,
    restoreMocks: true,
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
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/index.ts', 'src/testing/**', 'src/types.ts'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 }
    }
  }
});
