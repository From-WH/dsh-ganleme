/** Project sources: list, add, remove, and the Host directory picker. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { SANDBOX, git, makeHost } from './helpers.mjs';

/** A configEditor stand-in persisting the plugin row's override in memory. */
function fakeEditor(initial = []) {
  const entry = { options: { id: 'ganleme', name: 'dsh-ganleme', config: { extraRoots: [...initial] } } };
  return {
    entry,
    entries: () => [entry],
    async edit(target, change) {
      const next = change(structuredClone(target.options.config), {});
      target.options.config = next;
    },
  };
}

const project = (name) => {
  const dir = `${SANDBOX}/projects/${name}`;
  mkdirSync(dir, { recursive: true });
  git(dir, ['init', '-q']);
  return dir;
};

test('add is idempotent, remove deletes, bad paths are refused', async () => {
  const dir = project('p1');
  const editor = fakeEditor();
  const { call } = await makeHost({ services: { configEditor: editor } });
  const add = await call('/ganleme/roots/add', { method: 'POST', body: { path: dir } });
  assert.equal(add.status, 200);
  assert.equal(add.json.added, true);
  const again = await call('/ganleme/roots/add', { method: 'POST', body: { path: dir } });
  assert.equal(again.json.added, false);
  assert.equal(editor.entry.options.config.extraRoots.length, 1);
  const remove = await call('/ganleme/roots/remove', { method: 'POST', body: { path: dir } });
  assert.equal(remove.json.removed, true);
  assert.deepEqual(editor.entry.options.config.extraRoots, []);
  assert.equal((await call('/ganleme/roots/add', { method: 'POST', body: { path: '/no/such/dir' } })).status, 400);
  assert.equal((await call('/ganleme/roots/add', { method: 'POST', body: {} })).status, 400);
});

test('pick: adds the chosen folder, handles cancel and duplicates', async () => {
  const dir = project('p2');
  let answer = dir;
  const editor = fakeEditor();
  const { call } = await makeHost({
    services: { configEditor: editor, directoryPickerController: { pick: async () => answer } },
  });
  const first = await call('/ganleme/roots/pick', { method: 'POST' });
  assert.equal(first.json.added, true);
  answer = null;
  assert.equal((await call('/ganleme/roots/pick', { method: 'POST' })).json.picked, false);
  answer = dir;
  assert.equal((await call('/ganleme/roots/pick', { method: 'POST' })).json.added, false);
  assert.equal(editor.entry.options.config.extraRoots.length, 1);
});

test('without picker or config editor the routes answer 501', async () => {
  const dir = project('p3');
  const { call } = await makeHost();
  assert.equal((await call('/ganleme/roots/pick', { method: 'POST' })).status, 501);
  assert.equal((await call('/ganleme/roots/add', { method: 'POST', body: { path: dir } })).status, 501);
});

test('GET /ganleme/roots lists the configured roots', async () => {
  const dir = project('p4');
  const { call } = await makeHost({ config: { extraRoots: [dir] } });
  assert.deepEqual((await call('/ganleme/roots')).json.roots, [dir]);
});

test('every route declares framework authentication', async () => {
  // Regression: on DSH 0.2.3+ the plugin used to call connection.requestRejection()
  // unconditionally. That method is gone, the call threw, and the webserver
  // answered 400 for every route. The route-level `auth` is what protects the
  // handler now; the old call may only survive as a guarded compatibility path.
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  const routes = [...src.matchAll(/kind: 'exact',([\s\S]{0,400}?)path: '([^']+)'/g)];
  assert.ok(routes.length >= 8, `expected every route, found ${routes.length}`);
  for (const [, between, path] of routes) {
    assert.match(between, /auth: 'required'/, `${path} declares auth`);
  }
  // The legacy call must never be reachable without a capability check.
  const guard = src.slice(src.indexOf('const rejected = (req, res) =>'), src.indexOf('const sendJson ='));
  assert.match(guard, /typeof guard\.requestRejection !== 'function'/, 'legacy call is feature-detected');
  assert.match(guard, /try \{/, 'and wrapped, so a throwing guard cannot 400 every route');
});

test('a registered route carries auth through to the server', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
  // The declaration must be on the route object the plugin hands the server,
  // not merely somewhere in the file.
  assert.ok(/webServer\.register\(\{[\s\S]{0,200}auth: 'required'/.test(src), 'auth sits in the registered object');
});

test('an old Harness that authenticates in-plugin still rejects', async () => {
  // DSH 0.2.1 exposed connection.requestRejection; the plugin must keep honouring it.
  const { makeHost } = await import('./helpers.mjs');
  const seen = [];
  const connection = {
    requestRejection: (req) => {
      seen.push(req.url);
      return req.url.includes('token=good') ? undefined : 401;
    },
  };
  const host = await makeHost({ services: { connection } });
  const denied = await host.call('/ganleme/stats?range=today');
  assert.equal(denied.status, 401, 'untrusted request is answered by the guard');
  const allowed = await host.call('/ganleme/stats?range=today&token=good');
  assert.equal(allowed.status, 200, 'trusted request reaches the handler');
  assert.equal(seen.length, 2);
});

test('a modern Harness without that method is never blocked by it', async () => {
  // This is the exact shape of the 400 regression: no requestRejection at all.
  const { makeHost } = await import('./helpers.mjs');
  const host = await makeHost({ services: { connection: {} } });
  assert.equal((await host.call('/ganleme/stats?range=today')).status, 200);
});
