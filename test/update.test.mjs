/** Self-update routes with a stubbed registry and plugin manager. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOT, makeHost } from './helpers.mjs';

const VERSION = JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8')).version;
const bump = (v) => v.replace(/(\d+)$/, (n) => String(Number(n) + 1));

/** Stub the npm packument fetch; returns a restore function. */
function stubRegistry(latest) {
  const real = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url) => {
    seen.push(String(url));
    return { ok: true, json: async () => ({ 'dist-tags': { latest } }) };
  };
  return { seen, restore: () => (globalThis.fetch = real) };
}

function fakeManager(source = 'dsh-ganleme@^0.2.0', { installFails = null, removeFails = false } = {}) {
  const calls = [];
  return {
    calls,
    async listBundles() {
      return [{ name: 'dsh-ganleme', version: VERSION, source }];
    },
    async removeBundle(name) {
      calls.push(['remove', name]);
      return removeFails ? { application: 'failed', error: { code: 'bundle-in-use' } } : { application: 'applied' };
    },
    async installBundle(spec) {
      calls.push(['install', spec]);
      if (installFails && spec.endsWith(`@${installFails}`)) {
        return { application: 'failed', error: { code: 'operation-error', diagnostic: 'minimumReleaseAge' } };
      }
      return { application: 'applied' };
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

test('meta reports the package.json version', async () => {
  const { call } = await makeHost({ services: { pluginManager: fakeManager() } });
  assert.equal((await call('/ganleme/meta')).json.version, VERSION);
});

test('without pluginManager, update is unavailable instead of failing later', async () => {
  const { call } = await makeHost();
  assert.equal((await call('/ganleme/meta')).json.update, null);
  assert.equal((await call('/ganleme/update')).status, 501);
  assert.equal((await call('/ganleme/update/install', { method: 'POST' })).status, 501);
});

test('check: detects a newer version on the configured registry', async () => {
  const reg = stubRegistry(bump(VERSION));
  try {
    const { call } = await makeHost({ services: { pluginManager: fakeManager() }, config: { updateRegistry: 'https://registry.test/' } });
    const { json } = await call('/ganleme/update');
    assert.equal(json.updateAvailable, true);
    assert.equal(json.latest, bump(VERSION));
    assert.equal(reg.seen[0], 'https://registry.test/dsh-ganleme');
  } finally {
    reg.restore();
  }
});

test('install: up to date does nothing', async () => {
  const reg = stubRegistry(VERSION);
  try {
    const manager = fakeManager();
    const { call } = await makeHost({ services: { pluginManager: manager } });
    const { status, json } = await call('/ganleme/update/install', { method: 'POST' });
    assert.equal(status, 200);
    assert.equal(json.started, false);
    await settle();
    assert.deepEqual(manager.calls, []);
  } finally {
    reg.restore();
  }
});

test('install: newer version is removed then installed', async () => {
  const reg = stubRegistry(bump(VERSION));
  try {
    const manager = fakeManager();
    const { call } = await makeHost({ services: { pluginManager: manager } });
    const { status } = await call('/ganleme/update/install', { method: 'POST' });
    assert.equal(status, 202);
    await settle();
    assert.deepEqual(manager.calls, [['remove', 'dsh-ganleme'], ['install', `dsh-ganleme@${bump(VERSION)}`]]);
    assert.equal((await call('/ganleme/meta')).json.lastUpdate, null, 'success records no failure');
  } finally {
    reg.restore();
  }
});

test('local link installs are never offered or replaced', async () => {
  const reg = stubRegistry(bump(VERSION));
  try {
    const manager = fakeManager('link:/Users/dev/dsh-ganleme');
    const { call } = await makeHost({ services: { pluginManager: manager } });
    const check = (await call('/ganleme/update')).json;
    assert.equal(check.localInstall, true);
    assert.equal(check.updateAvailable, false);
    const install = await call('/ganleme/update/install', { method: 'POST' });
    assert.equal(install.status, 409);
    assert.equal(install.json.code, 'local-install');
    await settle();
    assert.deepEqual(manager.calls, []);
  } finally {
    reg.restore();
  }
});

test('failed install reinstalls the old version and records why', async () => {
  const target = bump(VERSION);
  const reg = stubRegistry(target);
  try {
    const manager = fakeManager(undefined, { installFails: target });
    const { call } = await makeHost({ services: { pluginManager: manager } });
    assert.equal((await call('/ganleme/update/install', { method: 'POST' })).status, 202);
    await settle();
    assert.deepEqual(manager.calls, [
      ['remove', 'dsh-ganleme'],
      ['install', `dsh-ganleme@${target}`],
      ['install', `dsh-ganleme@${VERSION}`],
    ]);
    // The reinstalled plugin (a fresh host) reports the recorded failure.
    const fresh = await makeHost({ services: { pluginManager: fakeManager() } });
    const last = (await fresh.call('/ganleme/meta')).json.lastUpdate;
    assert.equal(last.to, target);
    assert.match(last.error, /minimumReleaseAge/);
  } finally {
    reg.restore();
  }
});

test('failed removal stops before installing', async () => {
  const reg = stubRegistry(bump(VERSION));
  try {
    const manager = fakeManager(undefined, { removeFails: true });
    const { call } = await makeHost({ services: { pluginManager: manager } });
    await call('/ganleme/update/install', { method: 'POST' });
    await settle();
    assert.deepEqual(manager.calls, [['remove', 'dsh-ganleme']]);
    assert.match((await call('/ganleme/meta')).json.lastUpdate.error, /bundle-in-use/);
  } finally {
    reg.restore();
  }
});
