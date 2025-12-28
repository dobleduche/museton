import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(env.VITE_OPENROUTER_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
         rollupOptions: {
           output: {
             manualChunks: {
               'react-vendor': ['react', 'react-dom'],
               'lucide': ['lucide-react'],
               // No longer chunking google-genai (removed)
             }
           }
         },
         chunkSizeWarningLimit: 700 // Increase limit if needed
       }
    };
});
