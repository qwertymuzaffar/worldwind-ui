import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { worldwindVitePlugin } from 'worldwind-kit/vite';

export default defineConfig({
  // GitHub Pages serves the demo under /worldwind-ui/react/; local dev stays at /.
  base: process.env.DEMO_BASE ?? '/',
  // worldwindVitePlugin keeps WorldWind's bundle working after production bundling.
  plugins: [react(), worldwindVitePlugin()],
  optimizeDeps: {
    include: ['@nasaworldwind/worldwind'],
  },
});
