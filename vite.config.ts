/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
) as {
  version: string;
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  // Exposes package.json's version to the app as __APP_VERSION__ (see
  // src/vite-env.d.ts) so the Profile page's version label always matches
  // package.json — bump the version there, nowhere else.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
