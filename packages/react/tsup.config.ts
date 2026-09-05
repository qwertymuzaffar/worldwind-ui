import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  platform: 'browser',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'worldwind-kit', '@nasaworldwind/worldwind'],
  banner: { js: "'use client';" },
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
