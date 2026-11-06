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

test('"mine" matches emails case-insensitively', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'mixed case', date: at(-2), email: 'Zhang@Dev.Local' });
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }] });
  assert.equal((await stats(call, { from: D, to: D })).json.mine.commits, 1);
});

test('"mine" accepts several configured emails', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'work', date: at(-2), email: 'zhang@corp.example' });
  commit(repo, { message: 'home', date: at(-2, '11:00'), email: 'zhang@home.example' });
  commit(repo, { message: 'other', date: at(-2, '12:00'), email: 'li@corp.example', name: '李四' });
  const { call } = await makeHost({
    workspaces: [{ path: repo, title: 'r' }],
    config: { myEmails: ['Zhang@Corp.Example', 'zhang@home.example'] },
  });
  const { json } = await stats(call, { from: D, to: D });
  assert.equal(json.mine.commits, 2);
  assert.deepEqual(json.repos[0].commits.filter((c) => c.mine).map((c) => c.subject).sort(), ['home', 'work']);
});

test('the legacy myEmail setting still works alongside myEmails', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'legacy', date: at(-2), email: 'old@x.example' });
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }], config: { myEmail: 'old@x.example' } });
  assert.equal((await stats(call, { from: D, to: D })).json.mine.commits, 1);
});

test('a rebased commit counts on the day it was written', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'base', date: at(-9) });
  // Authored two days ago, rewritten (rebased/amended) today.
  commit(repo, { message: 'rebased', authorDate: at(-2), date: at(0, '00:30') });
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }] });
  const written = await stats(call, { from: D, to: D });
  assert.deepEqual(written.json.repos[0].commits.map((c) => c.subject), ['rebased']);
  const rewrittenDay = await stats(call, { from: day(0), to: day(0) });
  assert.equal(rewrittenDay.json.totals.commits, 0, 'not double-counted on the rebase day');
});

/** main + merged feature branch + merge commit, all on day D. */
function mergedRepo() {
  const repo = makeRepo();
  commit(repo, { message: 'base', date: at(-9) });
  git(repo, ['checkout', '-q', '-b', 'feature']);
  commit(repo, { message: 'feature work', date: at(-2, '09:00') });
  git(repo, ['checkout', '-q', 'main']);
  commit(repo, { message: 'main work', date: at(-2, '10:00') });
  const when = at(-2, '11:00');
  git(repo, ['merge', '-q', '--no-ff', 'feature', '-m', 'Merge branch feature'], { GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when });
  return repo;
}

test('merge commits are not counted by default', async () => {
  const repo = mergedRepo();
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }] });
  const { json } = await stats(call, { from: D, to: D });
  assert.deepEqual(json.repos[0].commits.map((c) => c.subject).sort(), ['feature work', 'main work']);
  const withMerges = await makeHost({ workspaces: [{ path: repo, title: 'r' }], config: { includeMerges: true } });
  assert.equal((await stats(withMerges.call, { from: D, to: D })).json.repos[0].stats.commits, 3);
});

test('work on an unmerged local branch is counted once', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'base', date: at(-9) });
  git(repo, ['checkout', '-q', '-b', 'wip']);
  commit(repo, { message: 'wip on branch', date: at(-2) });
  git(repo, ['checkout', '-q', '-b', 'wip-copy']); // same commit reachable from two branches
  git(repo, ['checkout', '-q', 'main']);
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }] });
  const { json } = await stats(call, { from: D, to: D });
  assert.deepEqual(json.repos[0].commits.map((c) => c.subject), ['wip on branch']);
  const headOnly = await makeHost({ workspaces: [{ path: repo, title: 'r' }], config: { allBranches: false } });
  assert.equal((await stats(headOnly.call, { from: D, to: D })).json.repos[0].stats.commits, 0);
});

test('a repository without commits is empty, not an error', async () => {
  const repo = makeRepo();
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }] });
  const r = (await stats(call, { from: D, to: D })).json.repos[0];
  assert.equal(r.ok, true, r.error);
  assert.equal(r.stats.commits, 0);
});

test('a broken repository is still reported as an error', async () => {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const dir = `${SANDBOX}/broken-repo`;
  mkdirSync(`${dir}/.git`, { recursive: true });
  writeFileSync(`${dir}/.git/HEAD`, 'garbage\n');
  const { call } = await makeHost({ workspaces: [{ path: dir, title: 'broken' }] });
  const r = (await stats(call, { from: D, to: D })).json.repos[0];
  assert.equal(r.ok, false);
  assert.ok(r.error);
});

test('a past window is bounded by --until even with a tiny commitLimit', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'in window', date: at(-45) });
  // Beyond the rewrite buffer after the window, so --until keeps it out.
  commit(repo, { message: 'newer', date: at(-1) });
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }], config: { commitLimit: 1 } });
  const { json } = await stats(call, { from: day(-45), to: day(-45) });
  assert.deepEqual(json.repos[0].commits.map((c) => c.subject), ['in window']);
});

test('hitting commitLimit marks the repo as possibly incomplete', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'a', date: at(-2, '09:00') });
  commit(repo, { message: 'b', date: at(-2, '10:00') });
  const limited = await makeHost({ workspaces: [{ path: repo, title: 'r' }], config: { commitLimit: 1 } });
  assert.equal((await stats(limited.call, { from: D, to: D })).json.repos[0].truncated, true);
  const roomy = await makeHost({ workspaces: [{ path: repo, title: 'r' }] });
  assert.equal((await stats(roomy.call, { from: D, to: D })).json.repos[0].truncated, false);
});

test('many repositories are all read under the concurrency limit', async () => {
  const list = [];
  for (let i = 0; i < 14; i += 1) {
    const repo = makeRepo(`many-${i}`);
    commit(repo, { message: `c${i}`, date: at(-2) });
    list.push({ path: repo, title: `m${i}` });
  }
  const { call } = await makeHost({ workspaces: list, config: { gitConcurrency: 2 } });
  const { json } = await stats(call, { from: D, to: D });
  assert.equal(json.repos.length, 14);
  assert.ok(json.repos.every((r) => r.ok && r.stats.commits === 1));
  assert.deepEqual(json.repos.map((r) => r.title), list.map((w) => w.title), 'order is preserved');
});

test('a detached checkout names its commit instead of "HEAD"', async () => {
  const repo = makeRepo();
  commit(repo, { message: 'one', date: at(-2, '09:00') });
  const second = commit(repo, { message: 'two', date: at(-2, '10:00') });
  git(repo, ['checkout', '-q', '--detach', second]);
  const { call } = await makeHost({ workspaces: [{ path: repo, title: 'r' }] });
  const r = (await stats(call, { from: D, to: D })).json.repos[0];
  assert.equal(r.branch, `detached@${second.slice(0, 7)}`);
});

test('excludedPaths accepts ~ and symlinked paths', async () => {
  const { mkdirSync, symlinkSync } = await import('node:fs');
  const real = `${SANDBOX}/exclude-real`;
  mkdirSync(real, { recursive: true });
  const inner = `${real}/kept`;
  mkdirSync(inner, { recursive: true });
  git(inner, ['init', '-q']);
  commit(inner, { date: at(-2) });
  const link = `${SANDBOX}/exclude-link`;
  symlinkSync(real, link);
  const viaLink = await makeHost({ config: { extraRoots: [real], excludedPaths: [link] } });
  assert.equal((await stats(viaLink.call, { from: D, to: D })).json.repos.length, 0, 'symlink exclusion applies');
  const home = process.env.HOME;
  mkdirSync(`${home}/proj`, { recursive: true });
  git(`${home}/proj`, ['init', '-q']);
  commit(`${home}/proj`, { date: at(-2) });
  const viaTilde = await makeHost({ config: { extraRoots: [home], excludedPaths: ['~/proj'] } });
  assert.equal((await stats(viaTilde.call, { from: D, to: D })).json.repos.length, 0, '~ exclusion applies');
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
