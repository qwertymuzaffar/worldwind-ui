import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { worldwindVitePlugin } from 'worldwind-kit/vite';

export default defineConfig({
  // worldwindVitePlugin keeps WorldWind's bundle working after production bundling.
  plugins: [react(), worldwindVitePlugin()],
  optimizeDeps: {
    include: ['@nasaworldwind/worldwind'],
  },
});
