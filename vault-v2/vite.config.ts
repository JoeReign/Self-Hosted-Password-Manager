import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { workerSource } from './scripts/offline-worker.mjs';

const publicFiles = ['manifest.webmanifest', 'icons/favicon-32.png', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];

export default defineConfig({
  base: './',
  build: { sourcemap: true },
  server: { host: '127.0.0.1', strictPort: true },
  plugins: [{
    name: 'development-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
        .replace("connect-src 'self'", "connect-src 'self' ws://127.0.0.1:* ws://localhost:*");
    },
  }, {
    name: 'offline-app-shell',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter(name => /\.(js|css)$/.test(name)).sort();
      const digest = createHash('sha256').update(JSON.stringify(assets));
      for (const file of publicFiles) digest.update(readFileSync(`public/${file}`));
      digest.update(readFileSync('index.html'));
      digest.update(readFileSync('scripts/offline-worker.mjs'));
      const version = digest.digest('hex').slice(0, 16);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: workerSource(version, ['index.html', ...assets, ...publicFiles]) });
    },
  }],
});
