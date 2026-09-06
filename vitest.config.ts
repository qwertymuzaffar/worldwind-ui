import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/kit', 'packages/react', 'packages/angular'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: ['packages/kit/src/testing/**', 'packages/**/*.d.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
