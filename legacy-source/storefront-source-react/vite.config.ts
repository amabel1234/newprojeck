import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';


const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'ncl-dev-badge',
      transformIndexHtml() {
        if (process.env.NODE_ENV === 'production') return;
        return [{
          tag: 'div',
          attrs: {
            id: 'ncl-dev-badge',
            style: 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:170px;height:58px;border:1px solid rgba(168,85,247,.7);border-radius:14px;background:rgba(4,4,8,.92);box-shadow:0 8px 30px rgba(0,0,0,.45),0 0 24px rgba(168,85,247,.18);overflow:hidden;backdrop-filter:blur(10px);pointer-events:none;',
          },
          injectTo: 'body',
          children: [{
            tag: 'img',
            attrs: {
              src: '/ncl-logo.png',
              alt: 'Built by nCL',
              style: 'display:block;width:100%;height:100%;object-fit:contain;',
            },
          }],
        }];
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
