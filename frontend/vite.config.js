
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/SVETES1/',
  plugins: [react()],

  // Dev: proxy /api → localhost:4000
  // Prod: VITE_API_URL задаётся в Render как env variable
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
