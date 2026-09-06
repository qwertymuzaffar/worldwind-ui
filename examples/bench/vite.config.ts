import { defineConfig } from 'vite';
import { worldwindVitePlugin } from 'worldwind-kit/vite';

export default defineConfig({ base: './', plugins: [worldwindVitePlugin()] });
