import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// API keys are NEVER inlined into the client bundle.
// The Gemini call runs in a Firebase Cloud Function (`functions/src/index.ts`)
// where the key lives as a secret. The browser only talks to the callable.
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
