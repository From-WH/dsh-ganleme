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
