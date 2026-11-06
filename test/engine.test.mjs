/** Pure Host functions: windows, version ordering, and git log parsing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHost } from './helpers.mjs';

const host = await loadHost();
const RECORD = '\u0001';
const FIELD = '\u0002';

function logBlock({ subject = 's', author = 'a', email = 'a@x', ts, numstat = '' }) {
  return `${RECORD}hhhh${FIELD}h${FIELD}${author}${FIELD}${email}${FIELD}${ts}${FIELD}${subject}\n${numstat}`;
}

test('windowFor: today, yesterday, Monday-based week, month', () => {
  const now = new Date(2026, 10, 4, 17, 50); // Wednesday
  assert.equal(host.windowFor('today', now).from.getDate(), 4);
  assert.equal(host.windowFor('yesterday', now).from.getDate(), 3);
  const week = host.windowFor('week', now);
  assert.equal(week.from.getDay(), 1);
  assert.equal(week.from.getDate(), 2);
  assert.equal(host.windowFor('month', now).from.getDate(), 1);
  assert.equal(host.windowFor('nope', now), null);
});

test('customWindow: accepts valid ranges, rejects bad ones', () => {
  const now = new Date(2026, 10, 6, 10);
  const ok = host.customWindow('2026-11-01', '2026-11-03', now);
  assert.equal(ok.error, undefined);
  assert.equal(ok.to.getDate(), 4, 'to is exclusive');
  assert.equal(host.customWindow('2026-11-06', '2026-11-06', now).error, undefined, 'today-only allowed');
  assert.equal(host.customWindow('2025-11-06', '2026-11-06', now).error, undefined, '366 days allowed');
  for (const [from, to] of [
    ['2026-11-07', '2026-11-07'],
    ['2026-11-05', '2026-11-01'],
    ['2026-02-31', '2026-03-01'],
    ['2026/11/01', '2026-11-02'],
    ['2025-01-01', '2026-11-01'],
  ]) {
    assert.ok(host.customWindow(from, to, now).error, `${from}..${to} must be rejected`);
  }
});

test('compareVersions follows npm prerelease ordering', () => {
  const c = host.compareVersions;
  assert.ok(c('1.2.0', '1.0.0') > 0);
  assert.ok(c('1.10.0', '1.9.9') > 0);
  assert.ok(c('1.0.0-rc.2', '1.0.0-rc.1') > 0);
  assert.ok(c('1.0.0-rc.1', '1.0.0') < 0);
  assert.equal(c('0.2.2', '0.2.2'), 0);
});

test('parseLog: window filter, numstat totals, binary files, newest first', () => {
  const window = { from: new Date('2026-11-02T00:00:00Z'), to: new Date('2026-11-03T00:00:00Z') };
  const ts = (iso) => Math.floor(new Date(iso).getTime() / 1000);
  const stdout = [
    logBlock({ subject: 'early', ts: ts('2026-11-02T01:00:00Z'), numstat: '3\t1\ta.js\n-\t-\timg.png\n' }),
    logBlock({ subject: 'late', ts: ts('2026-11-02T09:00:00Z'), numstat: '2\t0\tb.js\n' }),
    logBlock({ subject: 'outside', ts: ts('2026-11-03T01:00:00Z'), numstat: '9\t9\tc.js\n' }),
  ].join('');
  const commits = host.parseLog(stdout, window);
  assert.deepEqual(commits.map((c) => c.subject), ['late', 'early']);
  assert.equal(commits[1].insertions, 3);
  assert.equal(commits[1].deletions, 1);
  assert.equal(commits[1].files, 2, 'binary files still count as changed files');
});

test('mapLimit keeps order and never exceeds the limit', async () => {
  let live = 0;
  let peak = 0;
  const out = await host.mapLimit([5, 1, 4, 2, 3, 0, 6], 3, async (n) => {
    live += 1;
    peak = Math.max(peak, live);
    await new Promise((resolve) => setTimeout(resolve, n * 3));
    live -= 1;
    return n * 10;
  });
  assert.deepEqual(out, [50, 10, 40, 20, 30, 0, 60]);
  assert.equal(peak, 3);
  assert.deepEqual(await host.mapLimit([], 4, async () => 1), []);
});

test('parseLog: rename paths resolve to the new path', { todo: 'low-priority fix: nested brace renames' }, () => {
  const window = { from: new Date(0), to: new Date('2100-01-01') };
  const cases = {
    'old.js => new.js': 'new.js',
    'src/{old => new}/file.js': 'src/new/file.js',
    'src/{a.js => b.js}': 'src/b.js',
    '{lib => src}/x.js': 'src/x.js',
    'src/{ => sub}/y.js': 'src/sub/y.js',
  };
  for (const [raw, expected] of Object.entries(cases)) {
    const [commit] = host.parseLog(logBlock({ ts: 1_800_000_000, numstat: `1\t0\t${raw}\n` }), window);
    assert.deepEqual(commit.paths, [expected], raw);
  }
});
