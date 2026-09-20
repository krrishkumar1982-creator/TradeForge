import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function expressApiPlugin(): Plugin {
  return {
    name: 'express-api-plugin',
    async configureServer(server) {
      const { initSocketServer } = await import('./src/server/socket');
      const { app, startBackgroundRetryProcessor } = await import('./src/server/app');

      if (server.httpServer) {
        initSocketServer(server.httpServer as any);
      }
      startBackgroundRetryProcessor();
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith('/api') || req.url.startsWith('/health'))) {
          return app(req as any, res as any, next);
        }
        next();
      });
    },
    async configurePreviewServer(server) {
      const { initSocketServer } = await import('./src/server/socket');
      const { app, startBackgroundRetryProcessor } = await import('./src/server/app');

      if (server.httpServer) {
        initSocketServer(server.httpServer as any);
      }
      startBackgroundRetryProcessor();
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith('/api') || req.url.startsWith('/health'))) {
          return app(req as any, res as any, next);
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
