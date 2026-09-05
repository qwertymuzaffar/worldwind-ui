import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'worldwind-kit',
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
  },
});
