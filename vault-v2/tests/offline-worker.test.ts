import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { workerSource } from '../scripts/offline-worker.mjs';

function environment(redirected = false) {
  const events = new Map<string, (event: any) => void>();
  const stores = new Map<string, Map<string, Response>>();
  const fetched: string[] = [];
  let activated = false;
  const self = {
    location: { href: 'https://example.test/vault/sw.js' },
    addEventListener: (name: string, listener: (event: any) => void) => events.set(name, listener),
    skipWaiting: async () => { activated = true; },
    clients: { claim: async () => {} },
  };
  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return {
        put: async (url: string, response: Response) => { stores.get(name)!.set(url, response.clone()); },
        match: async (url: string) => stores.get(name)!.get(url)?.clone(),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const fetch = async (url: string) => {
    fetched.push(url);
    if (redirected) return { ok: true, redirected: true };
    const response = url.endsWith('.js')
      ? new Response('/* app */', { headers: { 'content-type': 'application/javascript' } })
      : new Response('<meta name="application-name" content="Local Vault">', { headers: { 'content-type': 'text/html' } });
    return response;
  };
  vm.runInNewContext(workerSource('version', ['index.html', 'assets/app.js']), { self, caches, fetch, URL });
  async function lifecycle(name: string) {
    let pending: Promise<unknown> | undefined;
    events.get(name)!({ waitUntil: (promise: Promise<unknown>) => { pending = promise; } });
    await pending;
  }
  return { events, stores, fetched, lifecycle, activated: () => activated };
}

test('offline worker caches only shipped assets, supports a subpath, and leaves vault files alone', async () => {
  const env = environment();
  await env.lifecycle('install');
  assert.equal(env.activated(), false);
  assert.deepEqual(env.fetched, ['https://example.test/vault/index.html', 'https://example.test/vault/assets/app.js']);
  let response: Promise<Response> | undefined;
  env.events.get('fetch')!({ request: new Request('https://example.test/vault/'), respondWith: (value: Promise<Response>) => { response = value; } });
  assert.ok(response);
  assert.match(await (await response).text(), /Local Vault/);
  assert.equal(env.fetched.length, 2);
  for (const url of ['https://example.test/vault/passwords.enc.json', 'https://other.test/assets/app.js']) {
    let intercepted = false;
    env.events.get('fetch')!({ request: new Request(url), respondWith: () => { intercepted = true; } });
    assert.equal(intercepted, false);
  }
  env.events.get('message')!({ data: { type: 'ACTIVATE_UPDATE' } });
  assert.equal(env.activated(), true);
});

test('an auth redirect cannot be saved as the offline app; incomplete caches are discarded', async () => {
  const env = environment(true);
  await assert.rejects(env.lifecycle('install'), /unavailable/);
  assert.equal(env.stores.size, 0);
});

test('activation removes only this app scope’s older caches', async () => {
  const env = environment();
  env.stores.set('local-vault-shell-%2Fother%2F-older', new Map());
  env.stores.set('local-vault-shell-%2Fvault%2F-older', new Map());
  await env.lifecycle('install');
  await env.lifecycle('activate');
  assert.equal(env.stores.has('local-vault-shell-%2Fother%2F-older'), true);
  assert.equal(env.stores.has('local-vault-shell-%2Fvault%2F-older'), false);
});
