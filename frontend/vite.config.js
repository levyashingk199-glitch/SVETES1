import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Render публикует frontend в корне домена.
  // Путь /SVETES1/ приводил к 404 для JS/CSS и пустой странице.
  base: '/',
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
