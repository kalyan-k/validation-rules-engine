import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const outputDirectory = resolve(__dirname, '../../dist/packages/react');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-react-package-metadata',
      closeBundle() {
        mkdirSync(outputDirectory, { recursive: true });
        for (const file of ['package.json', 'README.md', 'LICENSE']) {
          copyFileSync(resolve(__dirname, file), resolve(outputDirectory, file));
        }
      }
    }
  ],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    sourcemap: true,
    lib: { entry: resolve(__dirname, 'src/index.ts'), formats: ['es'], fileName: () => 'index.js' },
    rollupOptions: { external: ['@validation-rules-engine/core', 'react', 'react/jsx-runtime', 'react-dom'] }
  }
});
