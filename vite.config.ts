import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When building inside GitHub Actions, set base to /dashK/ so asset
// paths resolve correctly under https://fvsilva.github.io/dashK/
const base = process.env.GITHUB_ACTIONS ? '/dashK/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 5173,
  },
});
