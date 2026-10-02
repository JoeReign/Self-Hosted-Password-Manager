/** Cache only the shipped application shell; vault data never enters CacheStorage. */
export function workerSource(version, files) {
  return `
const BASE = new URL('./', self.location.href);
const PREFIX = 'local-vault-shell-' + encodeURIComponent(BASE.pathname) + '-';
const CACHE = PREFIX + '${version}';
const FILES = ${JSON.stringify(files)};
const URLS = FILES.map(file => new URL(file, BASE).href);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      for (const url of URLS) {
        const response = await fetch(url, { cache: 'reload', credentials: 'same-origin' });
        if (!response.ok || response.redirected) throw new Error('App asset unavailable');
        const type = response.headers.get('content-type') || '';
        if (url.endsWith('.js') && !/javascript/.test(type)) throw new Error('Invalid script response');
        if (url.endsWith('index.html')) {
          const html = await response.clone().text();
          if (!html.includes('name="application-name" content="Local Vault"')) throw new Error('Invalid app document');
        }
        await cache.put(url, response);
      }
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') void self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin || url.search) return;
  const key = url.href === BASE.href ? new URL('index.html', BASE).href : url.href;
  if (!URLS.includes(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(key)) || fetch(request);
  })());
});
`;
}
