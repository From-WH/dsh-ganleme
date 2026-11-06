/** Browser half: report rendering, quips, skins, date helpers, and a render smoke test. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeIndexedDB, fakeReact, loadClient } from './helpers.mjs';

const client = await loadClient();
const T = client.__test;

const zh = {
  'report.title.daily': '日报',
  'report.rangeLabel': '统计范围',
  'scope.mine': '只看我',
  'scope.all': '全部人',
  'report.overviewPlain': '一、总览',
  'report.overviewBody': '本期共提交 {commits} 次，新增 {additions} 行，删除 {deletions} 行，涉及 {repos} 个仓库。',
  'report.detailPlain': '二、分仓库明细',
  'report.repoLine': '{commits} 次提交，新增 {additions} 行，删除 {deletions} 行',
  'report.truncated': '（仅展示前 20 条）',
  'report.emptyBody': '本期没有提交记录。',
  'report.errors': '无法统计的仓库',
  'report.noIdentityNote': '注意：以下仓库未配置 git 身份，你的提交无法识别，未计入：{repos}',
  'report.overview': '总览',
  'report.detail': '分仓库明细',
  'report.footer': '由 {app} 生成',
  title: '干了么',
};
const t = (k) => zh[k] ?? `<${k}>`;

const c = (hash, subject, author, time, mine, ins) => ({ hash, author, email: '', subject, time, mine, insertions: ins, deletions: 0, files: 1, paths: [] });
const stats = (commits, ins) => ({ commits, insertions: ins, deletions: 0, files: commits, authors: [] });
const data = {
  from: '2026-11-04T16:00:00.000Z',
  to: '2026-11-05T16:00:00.000Z',
  generatedAt: '2026-11-05T00:30:00.000Z',
  totals: { ...stats(3, 3), repos: 2 },
  mine: { ...stats(2, 1), repos: 1 },
  repos: [
    {
      key: 'a', title: 'repo-a', ok: true, branch: 'master', me: { email: 'z@x' },
      stats: stats(2, 1), mine: stats(2, 1),
      commits: [c('e78ebb9', 'refactor: 重命名', '张三', '2026-11-04T07:40:00.000Z', true, 0), c('e1fc45b', 'fix: 修复', '张三', '2026-11-04T06:10:00.000Z', true, 1)],
    },
    {
      key: 'b', title: 'repo-b', ok: true, branch: 'main', me: { email: 'l@x' },
      stats: stats(1, 2), mine: stats(0, 0),
      commits: [c('ab81078', 'docs: 补充', '李四', '2026-11-04T03:00:00.000Z', false, 2)],
    },
  ],
};

test('plain detailed report: headings, branch, time, no Markdown, mine excludes others', () => {
  const text = T.buildReport(t, 'daily', data, 'mine', 'plain', false);
  assert.ok(text.startsWith('日报 · 2026-11-05'));
  assert.ok(text.includes('一、总览') && text.includes('二、分仓库明细'));
  assert.ok(text.includes('1. repo-a（master）'));
  assert.ok(text.includes('15:40'));
  assert.ok(!text.includes('#') && !text.includes('`'));
  assert.ok(!text.includes('repo-b'));
  assert.ok(!text.includes('张三'), 'mine scope omits the author');
});

test('plain brief report: overview first, no time, no headings', () => {
  const text = T.buildReport(t, 'daily', data, 'mine', 'plain', true);
  assert.ok(text.startsWith('本期共提交 2 次'));
  assert.ok(!text.includes('15:40') && !text.includes('一、总览') && !text.includes('（master）'));
  assert.ok(text.includes('   - refactor: 重命名（+0/-0）'));
});

test('all scope keeps author names; Markdown keeps hashes when detailed', () => {
  const all = T.buildReport(t, 'daily', data, 'all', 'plain', false);
  assert.ok(all.includes('（李四 +2/-0）'));
  const md = T.buildReport(t, 'daily', data, 'all', 'markdown', false);
  assert.ok(md.startsWith('# 日报') && md.includes('`e78ebb9`') && md.includes('— 李四'));
  const mdBrief = T.buildReport(t, 'daily', data, 'mine', 'markdown', true);
  assert.ok(!mdBrief.includes('`e78ebb9`') && !mdBrief.includes('# 日报'));
});

test('repos without git identity are named in mine reports', () => {
  const extra = { ...data, repos: [...data.repos, { key: 'c', title: 'repo-c', ok: true, me: null, stats: stats(1, 1), mine: stats(0, 0), commits: [] }] };
  assert.ok(T.buildReport(t, 'daily', extra, 'mine', 'plain', true).includes('repo-c'));
});

test('quip pools are large and unique; deck never repeats within a cycle', () => {
  for (const pools of Object.values(T.QUIP_POOLS)) {
    for (const [category, pool] of Object.entries(pools)) {
      assert.ok(pool.length >= 5, category);
      assert.equal(new Set(pool).size, pool.length, `${category} has duplicates`);
      assert.ok(T.QUIP_MOOD[category]);
    }
  }
  const draw = T.makeQuipDeck(['a', 'b', 'c', 'd']);
  for (let cycle = 0; cycle < 3; cycle += 1) {
    assert.equal(new Set([draw(), draw(), draw(), draw()]).size, 4);
  }
  assert.equal(T.quipCategory({ commits: 0 }), 'zero');
  assert.equal(T.quipCategory({ commits: 12, insertions: 1, deletions: 0 }), 'big');
  assert.equal(T.quipCategory({ commits: 4, insertions: 1, deletions: 200 }), 'del');
});

test('skins, daily background pick, and image filter', () => {
  assert.equal(T.SKINS.length, 5);
  assert.equal(T.veilOf('nope'), T.veilOf('default'));
  const a = T.dailyIndex(7, new Date(2026, 10, 5, 9));
  assert.equal(a, T.dailyIndex(7, new Date(2026, 10, 5, 23)));
  const picks = new Set(Array.from({ length: 20 }, (_, i) => T.dailyIndex(5, new Date(2026, 10, i + 1))));
  assert.ok(picks.size > 1);
  assert.equal(T.imageFiles([{ type: 'image/png' }, { type: 'text/plain' }, {}]).length, 1);
});

test('date presets and custom range validation', () => {
  const now = new Date(2026, 10, 6, 10);
  assert.deepEqual(T.presetRange('last7', now), { from: '2026-10-31', to: '2026-11-06' });
  assert.deepEqual(T.presetRange('lastWeek', now), { from: '2026-10-26', to: '2026-11-01' });
  assert.deepEqual(T.presetRange('lastMonth', now), { from: '2026-10-01', to: '2026-10-31' });
  assert.equal(T.customRangeError('2026-11-07', '2026-11-07', now), 'custom.errFuture');
  assert.equal(T.customRangeError('2026-11-05', '2026-11-01', now), 'custom.errOrder');
  assert.equal(T.customRangeError('2024-01-01', '2026-11-01', now), 'custom.errSpan');
  assert.equal(T.customRangeError('', '2026-11-01', now), 'custom.errIncomplete', 'a cleared date is not an order error');
});

test('a daily report is dated by the day it covers', () => {
  const yesterday = { ...data, from: '2026-11-03T16:00:00.000Z', to: '2026-11-04T16:00:00.000Z', generatedAt: '2026-11-05T01:00:00.000Z' };
  assert.ok(T.buildReport(t, 'daily', yesterday, 'mine', 'plain', false).startsWith('日报 · 2026-11-04'));
});

test('on the Yesterday tab the daily report button covers yesterday', async () => {
  const mod = await loadClient({ react: fakeReact({ 0: 'yesterday' }) });
  const registered = [];
  mod.apply({
    effect() {},
    locale: { register() {}, bind: () => (k) => k },
    slots: { inject: (_name, cb) => cb(), register: (opts, comp) => registered.push({ opts, comp }) },
  });
  const page = registered.find((r) => r.opts.name === 'main');
  const tree = JSON.stringify(page.comp({ t: (k) => k, addRootPick: async () => ({}), addRoot: async () => ({}), removeRoot: async () => ({}), loadRoots: async () => [] }));
  assert.ok(tree.includes('report.dailyYesterday'));
});

test('uploaded background lives in IndexedDB, apart from the folder library', async () => {
  const storage = new Map([['dsh.ganleme.bg', 'data:image/jpeg;base64,LEGACY']]);
  globalThis.indexedDB = fakeIndexedDB();
  const mod = await loadClient({ storage });
  const B = mod.__test;
  // A pre-0.3 localStorage copy moves into IndexedDB and frees the quota.
  assert.equal(await B.loadManualBg(), 'data:image/jpeg;base64,LEGACY');
  assert.equal(storage.has('dsh.ganleme.bg'), false);
  assert.equal(await B.manualBgGet(), 'data:image/jpeg;base64,LEGACY');
  // Clearing the folder library keeps the uploaded image.
  await B.bgDbPut('0', 'pool-image');
  await B.bgDbClear();
  assert.deepEqual(await B.bgDbGetAll(), []);
  assert.equal(await B.loadManualBg(), 'data:image/jpeg;base64,LEGACY');
  await B.manualBgSet(null);
  assert.equal(await B.loadManualBg(), null);
  delete globalThis.indexedDB;
});

test('an existing v1 library survives the upgrade to v2', async () => {
  const idb = fakeIndexedDB();
  idb.dbs.set('ganleme', { version: 1, stores: new Map([['bg', new Map([['0', 'old-pool-image']])]]) });
  globalThis.indexedDB = idb;
  const B = (await loadClient()).__test;
  assert.deepEqual(await B.bgDbGetAll(), ['old-pool-image']);
  assert.equal(await B.manualBgGet(), null, 'manual store created by the upgrade');
  delete globalThis.indexedDB;
});

test('stats cache entries expire', () => {
  let clock = 1_000;
  const cache = T.createStatsCache(60_000, () => clock);
  cache.set('today', { n: 1 });
  clock += 59_000;
  assert.deepEqual(cache.get('today'), { n: 1 });
  clock += 2_000;
  assert.equal(cache.get('today'), undefined, 'stale after the TTL');
  cache.set('a', 1);
  cache.clear();
  assert.equal(cache.get('a'), undefined);
});

test('the page reads the language from the locale service', async () => {
  const mod = await loadClient();
  const registered = [];
  mod.apply({
    effect() {},
    locale: { register() {}, bind: () => (k) => k, getLocale: () => ({ active: 'en' }) },
    slots: { inject: (_name, cb) => cb(), register: (opts, comp) => registered.push({ opts, comp }) },
  });
  const opts = registered.find((r) => r.opts.name === 'main').opts;
  assert.equal(opts.inject().localeId(), 'en');
});

test('dashboard renders in every range including custom', async () => {
  for (const range of ['today', 'custom']) {
    const mod = await loadClient({ react: fakeReact({ 0: range }) });
    const registered = [];
    mod.apply({
      effect() {},
      locale: { register() {}, bind: () => (k) => k },
      slots: { inject: (_name, cb) => cb(), register: (opts, comp) => registered.push({ opts, comp }) },
    });
    const page = registered.find((r) => r.opts.name === 'main');
    const tree = JSON.stringify(page.comp({ t: (k) => k, addRootPick: async () => ({}), addRoot: async () => ({}), removeRoot: async () => ({}), loadRoots: async () => [] }));
    assert.ok(tree.includes('gl-page'));
    if (range === 'custom') assert.ok(tree.includes('gl-dateRow'));
  }
});
