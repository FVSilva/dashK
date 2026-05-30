import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Actions sets GITHUB_ACTIONS=true automatically, so the build gets the
// correct base path for https://fvsilva.github.io/dashK/
const base = process.env.GITHUB_ACTIONS ? '/dashK/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 5173,
    // In dev, proxy /api → Express backend on :3001 so CORS is not an issue
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
