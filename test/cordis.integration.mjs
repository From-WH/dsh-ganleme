/**
 * Integration: load the real plugin into a real Cordis context.
 *
 * Fake contexts cannot catch Cordis's dependency guard ("cannot get property
 * X without inject"), which broke both the client page and self-update in the
 * past. This file imports Cordis from the installed DeepSeek Harness app, so
 * it runs through the app's Electron binary (see scripts/test.mjs); without
 * the app it skips.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOT, loadHost } from './helpers.mjs';

const CORDIS = '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/cordis/lib/index.js';
let cordis = null;
try {
  cordis = await import(CORDIS);
} catch {
  cordis = null;
}
const VERSION = JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8')).version;
const settle = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

/** Build a root context with the requested service stubs. */
function makeRoot(serviceNames, impls = {}) {
  const { Context, Service } = cordis;
  const root = new Context();
  const routes = new Map();
  const defaults = {
    webServer: {
      register(route) {
        routes.set(route.path, route);
        return () => routes.delete(route.path);
      },
    },
    connection: { requestRejection: () => undefined },
    workspaceRegistry: { list: () => [] },
    subprocess: { resolveExecutable: async () => 'git' },
    configEditor: { entries: () => [], edit: async () => {} },
    directoryPickerController: { pick: async () => null },
    llm: {
      listProviders: () => [{ id: 'fake', name: 'Fake' }],
      async *stream() {
        yield { type: 'text-delta', index: 0, text: '本期完成 3 次提交。' };
        yield { type: 'finish', reason: { kind: 'stop' } };
      },
    },
  };
  for (const name of serviceNames) {
    const impl = { ...defaults[name], ...impls[name] };
    class Stub extends Service {
      constructor(ctx) {
        super(ctx, name);
        Object.assign(this, impl);
      }
    }
    root.plugin(Stub);
  }
  return { root, routes };
}

async function request(routes, path, method = 'GET') {
  const route = routes.get(path);
  assert.ok(route, `route ${path} is registered`);
  const res = { statusCode: 0, body: '', setHeader() {}, end(payload) { this.body = payload ?? ''; } };
  const req = { method, url: path, headers: {}, async *[Symbol.asyncIterator]() {} };
  await route.handler(req, res);
  return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : null };
}

const CORE = ['webServer', 'connection', 'workspaceRegistry', 'subprocess'];
const skip = cordis ? false : 'DeepSeek Harness app not installed';

test('activates with only the core services', { skip }, async () => {
  const host = await loadHost();
  const { root, routes } = makeRoot(CORE);
  root.plugin(host, {});
  await settle();
  assert.ok(routes.has('/ganleme/stats'), 'stats route registered without optional services');
  const meta = await request(routes, '/ganleme/meta');
  assert.equal(meta.json.update, null, 'update is reported unavailable without pluginManager');
  assert.equal((await request(routes, '/ganleme/roots/pick', 'POST')).status, 501);
});

test('optional services may arrive after the plugin and may go away', { skip }, async () => {
  const { Service } = cordis;
  const host = await loadHost();
  const { root, routes } = makeRoot(CORE);
  root.plugin(host, {});
  await settle();
  assert.equal((await request(routes, '/ganleme/meta')).json.update, null);
  class LateManager extends Service {
    constructor(ctx) {
      super(ctx, 'pluginManager');
    }
    listBundles() {
      return [];
    }
  }
  const fiber = root.plugin(LateManager);
  await settle();
  assert.ok((await request(routes, '/ganleme/meta')).json.update, 'picked up a late pluginManager');
  await fiber.dispose();
  await settle();
  assert.equal((await request(routes, '/ganleme/meta')).json.update, null, 'dropped a removed pluginManager');
});

test('self-update reaches pluginManager through the real dependency guard', { skip }, async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ 'dist-tags': { latest: '99.0.0' } }) });
  try {
    const calls = [];
    const host = await loadHost();
    const { root, routes } = makeRoot([...CORE, 'pluginManager'], {
      pluginManager: {
        listBundles: async () => [{ name: 'dsh-ganleme', version: VERSION, source: 'dsh-ganleme@^0.2.0' }],
        removeBundle: async (name) => (calls.push(['remove', name]), { application: 'applied' }),
        installBundle: async (spec) => (calls.push(['install', spec]), { application: 'applied' }),
      },
    });
    root.plugin(host, {});
    await settle();
    const meta = await request(routes, '/ganleme/meta');
    assert.ok(meta.json.update, 'update is offered when pluginManager exists');
    const res = await request(routes, '/ganleme/update/install', 'POST');
    assert.equal(res.status, 202);
    await settle(150);
    assert.deepEqual(calls.at(-1), ['install', 'dsh-ganleme@99.0.0']);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('polish reaches the llm service through the real dependency guard', { skip }, async () => {
  const host = await loadHost();
  const { root, routes } = makeRoot([...CORE, 'llm']);
  root.plugin(host, { polishModel: 'fake-1' });
  await settle();
  const res = {
    statusCode: 0,
    body: '',
    headers: {},
    setHeader(key, value) {
      this.headers[key.toLowerCase()] = value;
    },
    write(chunk) {
      this.body += chunk;
      return true;
    },
    end() {},
  };
  const req = {
    method: 'POST',
    url: '/ganleme/polish',
    headers: {},
    on() {},
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify({ text: '本期共提交 3 次。', provider: 'fake', model: 'fake-1' }));
    },
  };
  await routes.get('/ganleme/polish').handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['content-type'], /text\/event-stream/);
  const frames = res.body
    .split('\n\n')
    .map((block) => block.split('\n').find((l) => l.startsWith('data: ')))
    .filter(Boolean)
    .map((line) => JSON.parse(line.slice(6)));
  assert.ok(frames.some((f) => f.type === 'delta' && f.text.includes('本期完成')));
  assert.equal(frames.at(-1).type, 'done');
});

test('without llm the polish route stays closed and meta says so', { skip }, async () => {
  const host = await loadHost();
  const { root, routes } = makeRoot(CORE);
  root.plugin(host, {});
  await settle();
  assert.equal((await request(routes, '/ganleme/meta')).json.polish, false);
  const res = { statusCode: 0, body: '', setHeader() {}, end(p) { this.body = p ?? ''; } };
  const req = { method: 'POST', url: '/ganleme/polish', headers: {}, on() {}, async *[Symbol.asyncIterator]() { yield Buffer.from('{"text":"x"}'); } };
  await routes.get('/ganleme/polish').handler(req, res);
  assert.equal(res.statusCode, 501);
});
