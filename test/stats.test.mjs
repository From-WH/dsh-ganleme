/** /ganleme/stats against real fixture repositories. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SANDBOX, at, commit, day, git, makeHost, makeRepo, stats } from './helpers.mjs';

const D = day(-2); // a fixed past day inside every window we query

test('counts commits and lines per repo, newest first', async () => {
  const repo = makeRepo();
  commit(repo, { content: 'a\n', message: 'one', date: at(-2, '09:00') });
  commit(repo, { content: 'a\nb\n', file: 'g.txt', message: 'two', date: at(-2, '11:00') });
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }] });
  const { status, json } = await stats(call, { from: D, to: D });
  assert.equal(status, 200);
  const r = json.repos[0];
  assert.equal(r.stats.commits, 2);
  assert.deepEqual(r.commits.map((c) => c.subject), ['two', 'one']);
  assert.equal(json.totals.insertions, 3);
});

test('"mine" uses the repository git identity', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'me', date: at(-2) });
  commit(repo, { message: 'colleague', date: at(-2, '11:00'), email: 'li@dev.local', name: '李四' });
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }] });
  const { json } = await stats(call, { from: D, to: D });
  assert.equal(json.totals.commits, 2);
  assert.equal(json.mine.commits, 1);
  assert.equal(json.repos[0].commits.find((c) => c.subject === 'colleague').mine, false);
});

test('a past window is bounded by --until even with a tiny commitLimit', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'in window', date: at(-3) });
  commit(repo, { message: 'newer', date: at(-1) });
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }], config: { commitLimit: 1 } });
  const { json } = await stats(call, { from: day(-3), to: day(-3) });
  assert.deepEqual(json.repos[0].commits.map((c) => c.subject), ['in window']);
});

test('custom ranges are validated', async () => {
  const { call } = await makeHost();
  assert.equal((await stats(call, { from: day(-1), to: day(-5) })).status, 400);
  assert.equal((await stats(call, { from: day(1), to: day(1) })).status, 400);
  assert.equal((await call('/ganleme/stats?range=nope')).status, 400);
});

test('adding a workspace shows up immediately despite the cache', async () => {
  const a = makeRepo();
  const b = makeRepo();
  commit(a, { date: at(-2) });
  commit(b, { date: at(-2) });
  let list = [{ path: a, title: 'A' }];
  const { call } = await makeHost({ workspaces: () => list });
  assert.equal((await stats(call, { from: D, to: D })).json.repos.length, 1);
  list = [...list, { path: b, title: 'B' }];
  assert.equal((await stats(call, { from: D, to: D })).json.repos.length, 2);
});

test('a folder workspace is scanned to scanDepth', async () => {
  const { mkdirSync } = await import('node:fs');
  const parent = `${SANDBOX}/folder-ws`;
  const deep = `${parent}/group/deep`;
  mkdirSync(deep, { recursive: true });
  git(deep, ['init', '-q']);
  commit(deep, { date: at(-2) });
  const one = await makeHost({ workspaces: [{ path: parent, title: 'p' }], config: { scanDepth: 1 } });
  assert.equal((await stats(one.call, { from: D, to: D })).json.repos.length, 0);
  const two = await makeHost({ workspaces: [{ path: parent, title: 'p' }], config: { scanDepth: 2 } });
  assert.equal((await stats(two.call, { from: D, to: D })).json.repos.length, 1);
});
