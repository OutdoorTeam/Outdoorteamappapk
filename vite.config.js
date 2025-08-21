import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export const vitePort = 3000;

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './client/src'),
        // Add alias for shared folder
        '~shared': path.resolve(__dirname, './shared'),
      },
    },
    root: path.join(process.cwd(), 'client'),
    build: {
      outDir: path.join(process.cwd(), 'public'),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    clearScreen: false,
    server: {
      hmr: {
        overlay: false,
      },
      host: true,
      port: vitePort,
      allowedHosts: true,
      cors: true,
      proxy: {
        '/api/': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
      // Allow access to shared folder from client
      fs: {
        allow: ['..']
      }
    },
    // Enable source maps for development
    css: {
      devSourcemap: true,
    },
    // Ensure source maps are properly generated
    esbuild: {
      sourcemap: true,
    },
  };
});
