import angular from '@analogjs/vite-plugin-angular';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const kit = (path: string) => fileURLToPath(new URL(`../kit/src/${path}`, import.meta.url));

export default defineConfig({
  plugins: [angular({ tsconfig: fileURLToPath(new URL('./tsconfig.spec.json', import.meta.url)) })],
  resolve: {
    // Test against the kit sources so no build step is needed between edits.
    alias: [
      { find: 'worldwind-kit/testing', replacement: kit('testing/index.ts') },
      { find: 'worldwind-kit', replacement: kit('index.ts') },
    ],
  },
  test: {
    name: 'ngx-worldwind',
    environment: 'jsdom',
    include: ['test/**/*.spec.ts'],
    setupFiles: ['test/setup.ts'],
  },
});
