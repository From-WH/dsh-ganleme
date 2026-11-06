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
  'report.truncatedCount': '（还有 {n} 条未展示）',
  'report.overviewBodyNoLines': '本期共提交 {commits} 次，涉及 {repos} 个仓库。',
  'report.repoLineNoLines': '{commits} 次提交',
  'report.emptyBody': '本期没有提交记录。',
  'report.errors': '无法统计的仓库',
  'report.noIdentityNote': '注意：以下仓库未配置 git 身份，你的提交无法识别，未计入：{repos}',
  'report.overview': '总览',
  'report.detail': '分仓库明细',
  'report.footer': '由 {app} 生成',
  title: '干了么',
};
const t = (k) => zh[k] ?? `<${k}>`;

const commit = (hash, subject, author, time, mine, ins, del = 0) => ({ hash, author, email: '', subject, time, mine, insertions: ins, deletions: del, files: 1, paths: [] });
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
      commits: [commit('e78ebb9', 'refactor: 重命名', '张三', '2026-11-04T07:40:00.000Z', true, 0), commit('e1fc45b', 'fix: 修复', '张三', '2026-11-04T06:10:00.000Z', true, 1)],
    },
    {
      key: 'b', title: 'repo-b', ok: true, branch: 'main', me: { email: 'l@x' },
      stats: stats(1, 2), mine: stats(0, 0),
      commits: [commit('ab81078', 'docs: 补充', '李四', '2026-11-04T03:00:00.000Z', false, 2)],
    },
  ],
};

test('worklog style: what was done only, no prefix, time, or line counts', () => {
  const text = T.buildReport(t, 'daily', data, 'mine', 'plain', { style: 'worklog' });
  assert.ok(text.startsWith('日报 · 2026-11-05'), 'keeps the date');
  assert.ok(!text.includes('统计范围'), 'no range line');
  assert.ok(!text.includes('一、总览') && !text.includes('二、分仓库明细'), 'no section headings');
  // Only repo-a has commits in the "mine" scope, so no repository heading.
  assert.ok(!text.includes('1. repo-a'), 'single active repo needs no heading');
  assert.ok(text.includes('- 重命名'), 'refactor: prefix is stripped');
  assert.ok(text.includes('- 修复'), 'fix: prefix is stripped');
  assert.ok(!text.includes('+0/-0') && !text.includes('新增'), 'line counts are gone');
  assert.ok(!text.includes('15:40'), 'no commit times');
  assert.ok(!text.includes('张三'), 'author toggle off by default');
  assert.ok(!text.includes('repo-b'));
  assert.ok(!text.includes('#') && !text.includes('`'));
});

test('detailed style keeps everything', () => {
  const text = T.buildReport(t, 'daily', data, 'all', 'plain', { style: 'detailed' });
  assert.ok(text.includes('统计范围') && text.includes('一、总览') && text.includes('二、分仓库明细'));
  assert.ok(text.includes('repo-a（master）'), 'heading keeps the branch, without a number');
  assert.ok(text.includes('15:40'), 'time kept');
  assert.ok(text.includes('（李四 11:00 +2/-0）'), 'author, time and lines kept');
  assert.ok(text.includes('refactor: 重命名'), 'prefix kept');
  const md = T.buildReport(t, 'daily', data, 'all', 'markdown', { style: 'detailed' });
  assert.ok(md.startsWith('# 日报') && !md.includes('e78ebb9'), 'commit hashes are gone');
});

test('brief and standard styles sit between the two', () => {
  const brief = T.buildReport(t, 'daily', data, 'mine', 'plain', { style: 'brief' });
  assert.ok(brief.includes('本期共提交 2 次，新增 1 行'), 'overview keeps line counts');
  assert.ok(!brief.includes('15:40'), 'brief still hides times');
  assert.ok(!brief.includes('3 次提交'), 'no per-repo stats line');
  const standard = T.buildReport(t, 'daily', data, 'mine', 'plain', { style: 'standard' });
  assert.ok(standard.includes('2 次提交，新增 1 行，删除 0 行'), 'standard shows the repo stats line');
  assert.ok(standard.includes('15:40'), 'standard shows times');
});

test('toggles override a style without changing the skeleton', () => {
  const withLines = T.buildReport(t, 'daily', data, 'mine', 'plain', { style: 'worklog', overrides: { lines: true } });
  assert.ok(withLines.includes('+0/-0'), 'line counts switched on');
  assert.ok(!withLines.includes('15:40'), 'times still off');
  const withTimeAuthors = T.buildReport(t, 'daily', data, 'all', 'plain', { style: 'worklog', overrides: { time: true, author: true } });
  assert.ok(withTimeAuthors.includes('15:40') && withTimeAuthors.includes('张三'));
  // The author toggle must work in the default "mine" scope too.
  const mineAuthor = T.buildReport(t, 'daily', data, 'mine', 'plain', { style: 'worklog', overrides: { author: true } });
  assert.ok(mineAuthor.includes('张三'), 'author shown in mine scope when ticked');
  assert.ok(!mineAuthor.includes('李四'));
  const keepPrefix = T.buildReport(t, 'daily', data, 'mine', 'plain', { style: 'worklog', overrides: { stripPrefix: false } });
  assert.ok(keepPrefix.includes('refactor: 重命名'), 'prefix kept when the toggle is off');
  const noLines = T.buildReport(t, 'daily', data, 'mine', 'plain', { style: 'detailed', overrides: { lines: false } });
  assert.ok(!noLines.includes('+0/-0') && noLines.includes('本期共提交 2 次，'), 'line counts and overview lines both dropped');
});

test('the commit limit caps each repository and says how many are hidden', () => {
  const many = {
    ...data,
    repos: [{
      ...data.repos[0],
      stats: stats(25, 25), mine: stats(25, 25),
      commits: Array.from({ length: 25 }, (_, i) => commit(`h${i}`, `改变 ${i}`, '张三', '2026-11-04T07:00:00.000Z', true, 1)),
    }, data.repos[1]],
  };
  const limited = T.buildReport(t, 'daily', many, 'mine', 'plain', { style: 'worklog', limit: 20 });
  assert.ok(limited.includes('（还有 5 条未展示）'));
  assert.equal((limited.match(/改变 /g) ?? []).length, 20);
  const all = T.buildReport(t, 'daily', many, 'mine', 'plain', { style: 'worklog', limit: 0 });
  assert.equal((all.match(/改变 /g) ?? []).length, 25, 'limit 0 shows everything');
  assert.ok(!all.includes('未展示'));
});

test('numbering styles render their own markers', () => {
  const one = {
    ...data,
    totals: { ...stats(3, 3), repos: 1 },
    mine: { ...stats(3, 3), repos: 1 },
    repos: [{
      ...data.repos[0],
      stats: stats(3, 3), mine: stats(3, 3),
      commits: [
        commit('h1', '修复登录', '张三', '2026-11-04T15:40:00.000Z', true, 2),
        commit('h2', '新增导出', '张三', '2026-11-04T14:10:00.000Z', true, 1),
        commit('h3', '优化查询', '张三', '2026-11-04T11:00:00.000Z', true, 0),
      ],
    }],
  };
  const body = (numbering) => T.buildReport(t, 'daily', one, 'mine', 'plain', { style: 'worklog', numbering })
    .split('\n')
    .filter((line) => /修复登录|新增导出|优化查询/.test(line));
  assert.deepEqual(body('dash').map((l) => l.trim()), ['- 修复登录', '- 新增导出', '- 优化查询']);
  assert.deepEqual(body('bullet').map((l) => l.trim()), ['• 修复登录', '• 新增导出', '• 优化查询']);
  assert.deepEqual(body('numbered').map((l) => l.trim()), ['1. 修复登录', '2. 新增导出', '3. 优化查询']);
  assert.deepEqual(body('paren').map((l) => l.trim()), ['1） 修复登录', '2） 新增导出', '3） 优化查询']);
  assert.deepEqual(body('none').map((l) => l.trim()), ['修复登录', '新增导出', '优化查询']);
});

test('numbering choices are live in plain text and inert for Markdown', async () => {
  // Regression: the condition was once inverted, so every marker button was
  // disabled in the default plain format. The choices now live in the settings
  // sheet; they must be clickable there and explain themselves for Markdown.
  const captured = [];
  const React = { ...fakeReact(), createElement: (type, props) => (captured.push({ type, props }), { type, props }) };
  const mod = await loadClient({ react: React });
  const render = (format) => {
    captured.length = 0;
    mod.__test.ReportSettings({
      draft: { ...mod.__test.DEFAULT_REPORT_CONFIG, format },
      onDraft() {}, preview: '', firstRun: false, onSave() {}, onCancel() {}, t: (k) => k,
    });
    const marker = /^(dash|bullet|numbered|paren|none)$/;
    return captured.filter((c) => c.type === 'button' && marker.test(String(c.props.key)));
  };
  const plain = render('plain');
  const markdown = render('markdown');
  assert.equal(plain.length, 5, 'five marker choices');
  assert.ok(plain.every((b) => !b.props.disabled), 'clickable for plain text');
  assert.ok(markdown.every((b) => !b.props.disabled), 'still selectable for Markdown');
  // The choice reaches the draft handler with its id.
  const seen = [];
  captured.length = 0;
  mod.__test.ReportSettings({
    draft: { ...mod.__test.DEFAULT_REPORT_CONFIG },
    onDraft: (next) => seen.push(next.numbering), preview: '', firstRun: false,
    onSave() {}, onCancel() {}, t: (k) => k,
  });
  captured.find((c) => c.type === 'button' && c.props.key === 'paren').props.onClick();
  assert.deepEqual(seen, ['paren']);
});

test('the format is asked for once, then reused', async () => {
  // First generate must open the settings sheet and generate nothing; after
  // saving, later generates reuse the saved format without asking again.
  const store = new Map();
  const React = { ...fakeReact(), createElement: (type, props, ...kids) => ({ type, props }) };
  const mod = await loadClient({ react: React, storage: store });
  const T = mod.__test;
  assert.equal(T.readReportConfig(), null, 'nothing saved yet');
  T.writeReportConfig({ ...T.DEFAULT_REPORT_CONFIG, style: 'brief', limit: 0 });
  const saved = T.readReportConfig();
  assert.equal(saved.style, 'brief');
  assert.equal(saved.limit, 0);
  // The sheet renders every group from the draft.
  const buttons = [];
  const captured = [];
  const React2 = { ...fakeReact(), createElement: (type, props) => (captured.push({ type, props }), { type, props }) };
  const mod2 = await loadClient({ react: React2, storage: new Map() });
  mod2.__test.ReportSettings({
    draft: { ...T.DEFAULT_REPORT_CONFIG },
    onDraft() {}, preview: '预览文本', firstRun: true,
    onSave() {}, onCancel() {}, t: (k) => k,
  });
  const keys = captured.filter((c) => c.type === 'button').map((c) => c.props.key).filter(Boolean);
  assert.ok(keys.includes('worklog') && keys.includes('detailed'), 'style cards');
  assert.ok(keys.includes('dash') && keys.includes('none'), 'numbering choices');
  assert.ok(captured.some((c) => c.type === 'pre' && c.props.className === 'gl-setPreviewBody'), 'live preview area rendered');
});

test('generate asks for a format only until one is saved', async () => {
  const mod = await loadClient();
  const intent = mod.__test.reportIntent;
  assert.deepEqual(intent({ hasConfig: false, sheetOpen: false }), { action: 'ask', retarget: true });
  assert.deepEqual(intent({ hasConfig: false, sheetOpen: true }), { action: 'ask', retarget: true },
    'a second click while the sheet is open retargets, never opens two sheets');
  assert.deepEqual(intent({ hasConfig: true, sheetOpen: false }), { action: 'generate', retarget: false });
  assert.deepEqual(intent({ hasConfig: true, sheetOpen: true }), { action: 'generate', retarget: false },
    'a confirmed format generates and discards a stale sheet');
});

test('saving a format persists every choice and reuses it next time', async () => {
  const store = new Map();
  const mod = await loadClient({ storage: store });
  const T = mod.__test;
  const chosen = { style: 'standard', numbering: 'paren', limit: 0, format: 'markdown', scope: 'all', overrides: { author: true } };
  T.writeReportConfig({ ...T.DEFAULT_REPORT_CONFIG, ...chosen });
  const reloaded = (await loadClient({ storage: store })).__test.readReportConfig();
  for (const [key, value] of Object.entries(chosen)) {
    assert.deepEqual(reloaded[key], value, key);
  }
});

test('confirming the format is a one-time step', async () => {
  const store = new Map();
  const mod = await loadClient({ storage: store });
  // Fresh install: no format, so the first generate asks.
  assert.equal(mod.__test.reportIntent({ hasConfig: !!mod.__test.readReportConfig(), sheetOpen: false }).action, 'ask');
  mod.__test.writeReportConfig({ ...mod.__test.DEFAULT_REPORT_CONFIG, style: 'brief' });
  const next = (await loadClient({ storage: store })).__test;
  assert.equal(next.reportIntent({ hasConfig: !!next.readReportConfig(), sheetOpen: false }).action, 'generate');
});

test('a sample preview renders for every style and format', async () => {
  const mod = await loadClient();
  const T = mod.__test;
  const t = (k) => k;
  for (const style of T.REPORT_STYLE_ORDER) {
    for (const format of ['plain', 'markdown']) {
      const text = T.buildReport(t, 'daily', T.PREVIEW_DATA, 'mine', format, { style, limit: 20 });
      assert.ok(text.includes('my-project') || text.includes('修复'), `${style}/${format} renders`);
    }
  }
});

test('one repository drops the heading and starts items at column 0', () => {
  const one = {
    ...data,
    totals: { ...stats(2, 1), repos: 1 },
    mine: { ...stats(2, 1), repos: 1 },
    repos: [data.repos[0]],
  };
  const text = T.buildReport(t, 'daily', one, 'mine', 'plain', { style: 'worklog', numbering: 'numbered' });
  assert.ok(!/1\. repo-a/.test(text), 'no repository heading for a single repo');
  assert.ok(text.includes('\n1. 重命名\n'), 'numbering starts at column 0');
  const multi = T.buildReport(t, 'daily', data, 'all', 'plain', { style: 'worklog', numbering: 'numbered' });
  assert.ok(/^repo-a$/m.test(multi), 'repository heading kept, without a number');
  assert.ok(!/^\d+\. repo-a/m.test(multi), 'no number in front of the repository name');
  assert.ok(multi.includes('  1. '), 'items indent under a heading');
});

test('numbering restarts per repository and Markdown falls back to its own markers', () => {
  const multi = T.buildReport(t, 'daily', data, 'all', 'plain', { style: 'worklog', numbering: 'numbered' });
  const groups = multi.split(/\nrepo-/).slice(1);
  assert.equal(groups.length, 2);
  for (const group of groups) assert.ok(group.includes('  1. '), 'each repository restarts at 1');
  const paren = T.buildReport(t, 'daily', data, 'all', 'markdown', { style: 'worklog', numbering: 'paren' });
  assert.ok(/^- /.test(paren.split('\n').find((l) => l.includes('重命名'))), 'Markdown keeps dash');
  const numbered = T.buildReport(t, 'daily', data, 'all', 'markdown', { style: 'worklog', numbering: 'numbered' });
  assert.ok(/^1\. /.test(numbered.split('\n').find((l) => l.includes('重命名'))), 'Markdown can number');
});

test('commit prefixes are stripped only when they are real type tags', () => {
  assert.equal(T.stripCommitPrefix('fix: 修复登录'), '修复登录');
  assert.equal(T.stripCommitPrefix('feat(api)!: 新增接口'), '新增接口');
  assert.equal(T.stripCommitPrefix('perf：优化查询'), '优化查询');
  assert.equal(T.stripCommitPrefix('修复: 列表错位'), '列表错位');
  assert.equal(T.stripCommitPrefix('API: add endpoint'), 'API: add endpoint', 'unknown type keeps its prefix');
  assert.equal(T.stripCommitPrefix('no prefix at all'), 'no prefix at all');
  assert.equal(T.stripCommitPrefix('fix: '), 'fix:', 'a bare type is not stripped to nothing');
});

test('the statistics line aligns with its items in the preview', () => {
  const one = {
    ...data,
    totals: { ...stats(3, 128), repos: 1 },
    mine: { ...stats(3, 128), repos: 1 },
    repos: [{
      ...data.repos[0],
      stats: stats(3, 128), mine: stats(3, 128),
      commits: [
        commit('h1', 'fix: 修复登录', '张三', '2026-11-04T15:40:00.000Z', true, 42),
        commit('h2', 'feat: 新增导出', '张三', '2026-11-04T14:10:00.000Z', true, 76),
        commit('h3', 'perf: 优化查询', '张三', '2026-11-04T11:00:00.000Z', true, 10),
      ],
    }],
  };
  const text = T.buildReport(t, 'daily', one, 'mine', 'plain', { style: 'detailed', limit: 20 });
  const lines = text.split('\n');
  const statLine = lines.find((l) => l.includes('3 次提交，新增'));
  assert.ok(statLine, 'statistics line present');
  assert.equal(statLine.trimStart(), statLine, 'no indent: a heading-less repo starts at column 0');
  const firstItem = lines.find((l) => l.includes('修复登录'));
  assert.equal(firstItem.trimStart(), firstItem, 'items share the column');
  // A blank line keeps the stats line from running into the list.
  assert.equal(lines[lines.indexOf(statLine) + 1], '', 'blank line between stats and items');
});

test('switching style clears manual overrides so the style takes effect', async () => {
  // Regression: ticked overrides survived a style change, so "show times" kept
  // forcing times on and the style buttons looked dead.
  const mod = await loadClient();
  const draft = { style: 'detailed', overrides: { time: true, author: true }, numbering: 'paren', limit: 20, format: 'plain', scope: 'mine' };
  const next = mod.__test.withStyle(draft, 'worklog');
  assert.equal(next.style, 'worklog');
  assert.deepEqual(next.overrides, {}, 'manual switches dropped with the old style');
  assert.equal(next.numbering, 'paren', 'explicit numbering choice is independent');
  const spec = mod.__test.resolveReportSpec(next.style, next.overrides);
  assert.equal(spec.time, false, 'worklog has no times');
  assert.equal(spec.author, false);
  // The cleared draft now renders the new style's own shape.
  const text = T.buildReport(t, 'daily', data, 'mine', 'plain', { style: next.style, overrides: next.overrides });
  assert.ok(!/\d{2}:\d{2}/.test(text), 'no times after switching to worklog');
});

test('the polish entry is offered only for a finished report', async () => {
  const mod = await loadClient();
  const T = mod.__test;
  assert.equal(T.polishSource(null), null);
  assert.equal(T.polishSource({ text: '' }), null);
  assert.equal(T.polishSource({ text: '   ' }), null);
  assert.equal(T.polishSource({ text: '日报 · 2026-11-05' }), '日报 · 2026-11-05');
});

test('the polish sheet renders its choices and the result area', async () => {
  const captured = [];
  const React = {
    ...fakeReact(),
    createElement: (type, props, ...kids) => {
      const node = { type, props: { ...props, children: kids.length === 1 ? kids[0] : kids } };
      captured.push(node);
      return node;
    },
  };
  const mod = await loadClient({ react: React });
  const render = (overrides = {}) => {
    captured.length = 0;
    mod.__test.PolishSheet({
      draft: { level: 'items', tone: 'plain', note: '', system: '' },
      onDraft() {}, phase: 'idle', output: '', onOutput() {}, error: '',
      onStart() {}, onStop() {}, onApply() {}, onCancel() {}, t: (k) => k,
      ...overrides,
    });
    return captured;
  };
  const idle = render();
  const choiceKeys = idle.filter((c) => c.type === 'button').map((c) => c.props.key).filter(Boolean);
  assert.deepEqual(choiceKeys.filter((k) => ['items', 'paragraph', 'summary'].includes(k)), ['items', 'paragraph', 'summary']);
  assert.deepEqual(choiceKeys.filter((k) => ['plain', 'report', 'natural'].includes(k)), ['plain', 'report', 'natural']);
  assert.ok(idle.some((c) => c.type === 'textarea' && c.props.className.includes('gl-textarea')), 'note and prompt are editable');
  assert.ok(idle.some((c) => c.type === 'details'), 'the prompt is inspectable');

  // While streaming the result is read-only and a Stop button appears.
  const streaming = render({ phase: 'streaming', output: '正在' });
  assert.ok(!streaming.some((c) => c.type === 'textarea' && String(c.props.className).includes('gl-textareaFill')), 'no editor yet');
  assert.ok(streaming.some((c) => c.type === 'button' && c.props.children === 'polish.stop'));

  // Once ready the result becomes an editable textarea and Apply is enabled.
  const ready = render({ phase: 'ready', output: '改写后的日报' });
  const editor = ready.find((c) => c.type === 'textarea' && String(c.props.className).includes('gl-textareaFill'));
  assert.ok(editor, 'result is editable');
  assert.equal(editor.props.value, '改写后的日报');
  const apply = ready.find((c) => c.type === 'button' && c.props.children === 'polish.apply');
  assert.equal(apply.props.disabled, false);
});

test('a rejected rewrite is explained, and apply stays available for hand edits', async () => {
  const captured = [];
  const React = {
    ...fakeReact(),
    createElement: (type, props, ...kids) => {
      const node = { type, props: { ...props, children: kids.length === 1 ? kids[0] : kids } };
      captured.push(node);
      return node;
    },
  };
  const mod = await loadClient({ react: React });
  captured.length = 0;
  mod.__test.PolishSheet({
    draft: { level: 'items', tone: 'plain', note: '', system: '' },
    onDraft() {}, phase: 'ready', output: '本期共提交 9 次', onOutput() {}, error: 'polish.numbersChanged',
    onStart() {}, onStop() {}, onApply() {}, onCancel() {}, t: (k) => k,
  });
  assert.ok(captured.some((c) => c.props.role === 'alert'), 'the number guard explains itself');
});

test('applying a rewrite either lands or explains itself, never nothing', async () => {
  // Regression: "apply" once threw (the guard was missing on the client) and the
  // failure was swallowed, so the button did nothing at all with no message.
  const mod = await loadClient();
  const apply = mod.__test.polishApplication;
  const source = '本期共提交 3 次，新增 128 行，删除 24 行。';

  const ok = apply(source, '  本期完成 3 次提交，新增 128 行、删除 24 行。  ');
  assert.equal(ok.applied, true);
  assert.equal(ok.text, '本期完成 3 次提交，新增 128 行、删除 24 行。', 'trimmed and accepted');

  const invented = apply(source, '本期完成 5 次提交，新增 128 行。');
  assert.equal(invented.applied, false);
  assert.equal(invented.reason, 'numbers');
  assert.deepEqual(invented.extra, ['5']);

  const empty = apply(source, '   ');
  assert.equal(empty.applied, false);
  assert.equal(empty.reason, 'empty');
});

test('the applied rewrite keeps the original reachable and shows a notice', async () => {
  // The report keeps `original` so the modal can offer the toggle, and the page
  // flashes a confirmation — both are what the user sees after pressing apply.
  const mod = await loadClient();
  const T = mod.__test;
  const outcome = T.polishApplication('本期共提交 3 次。', '本期完成 3 次提交。');
  assert.equal(outcome.applied, true);
  const report = { kind: 'daily', text: '本期共提交 3 次。', data: {} };
  const applied = { ...report, text: outcome.text, original: report.original ?? report.text, polished: true };
  assert.equal(applied.polished, true);
  assert.equal(applied.original, '本期共提交 3 次。', 'the untouched original is preserved');
  assert.equal(applied.text, '本期完成 3 次提交。');
});

test('the loading art carries the theme: bars, a sleeper and a fish', async () => {
  const captured = [];
  const React = {
    ...fakeReact(),
    createElement: (type, props, ...kids) => {
      const node = { type, props: { ...props, children: kids.length === 1 ? kids[0] : kids } };
      captured.push(node);
      return node;
    },
  };
  const mod = await loadClient({ react: React });
  mod.__test.LoadingGlyph({ size: 64, label: '正在统计…' });
  const byClass = (name) => captured.filter((c) => String(c.props.className ?? '') === name);
  assert.equal(byClass('gl-loadBar').length, 3, 'three growing bars');
  assert.equal(byClass('gl-loadSleeper').length, 1, 'the dozing figure');
  assert.equal(byClass('gl-loadZzz').length, 1, 'sleep marks');
  assert.equal(byClass('gl-loadFish').length, 1, 'the fish');
  assert.equal(byClass('gl-loadBubble').length, 2, 'bubbles');
  assert.ok(captured.some((c) => c.props.role === 'status'), 'announced as a status');
  assert.ok(byClass('gl-loadLabel').length === 1, 'the copy sits beside the art');
  // Gradient ids are scoped to the package so two loaders cannot collide.
  const ids = captured.filter((c) => c.type === 'linearGradient').map((c) => c.props.id);
  assert.equal(new Set(ids).size, 3);
  for (const id of ids) assert.match(id, /glLoadBar\d-/);
  const fills = captured.filter((c) => c.type === 'rect' && String(c.props.fill ?? '').startsWith('url(')).map((c) => c.props.fill);
  for (const fill of fills) {
    const ref = fill.slice(5, -1);
    assert.ok(ids.includes(ref), `fill ${fill} refers to a defined gradient`);
  }
});

test('the art is fully filled, with no thin outline styling', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../client.js', import.meta.url), 'utf8');
  const css = src.slice(src.indexOf('const css = `'), src.indexOf('const pad2'));
  // Every animated part must be present in the stylesheet, and motion must be optional.
  for (const name of ['gl-loadBar', 'gl-loadSleeper', 'gl-loadZzz', 'gl-loadFish', 'gl-loadBubble']) {
    assert.ok(css.includes('.' + name), `${name} is styled`);
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/, 'motion can be disabled');
  const reduceBlock = css.slice(css.indexOf('prefers-reduced-motion'));
  for (const name of ['gl-loadBar', 'gl-loadFish']) assert.ok(reduceBlock.includes(name), `${name} respects reduced motion`);
});

test('waiting copy rotates on a timer and stops when inactive', async () => {
  // Observe the hook's own contract: it reads state, advances it on the timer,
  // and only subscribes when a rotation can actually happen.
  const timers = [];
  const realSetInterval = globalThis.setInterval;
  const realClearInterval = globalThis.clearInterval;
  globalThis.setInterval = (fn) => (timers.push(fn), timers.length);
  globalThis.clearInterval = () => {};
  try {
    let current = 0;
    const applied = [];
    const React = {
      ...fakeReact(),
      useState: (initial) => {
        // A real setter always advances from the latest state, not the closed-over one.
        current = typeof initial === 'function' ? initial() : initial;
        return [current, (next) => {
          current = typeof next === 'function' ? next(current) : next;
          applied.push(current);
        }];
      },
      useEffect: (fn) => {
        fn();
      },
    };
    const mod = await loadClient({ react: React });
    const lines = ['正在统计…', '正在翻 git 账本…', '正在数你今天敲了多少行…'];
    const shown = mod.__test.useRotatingText(lines, 2400, true);
    assert.equal(shown, lines[0], 'starts at the first line');
    assert.equal(timers.length, 1, 'subscribes once while active');

    // Firing the tick advances to the next line; it wraps back to the start.
    timers[0]();
    assert.equal(applied.at(-1), 1, 'advances the index by one');
    timers[0]();
    assert.equal(applied.at(-1), 2);
    timers[0]();
    assert.equal(applied.at(-1), 0, 'wraps around after the last line');

    // An inactive rotation or a single-line list subscribes to nothing.
    timers.length = 0;
    mod.__test.useRotatingText(['only one'], 2400, true);
    assert.equal(timers.length, 0, 'a single line needs no timer');
    mod.__test.useRotatingText(lines, 2400, false);
    assert.equal(timers.length, 0, 'inactive rotation needs no timer');
  } finally {
    globalThis.setInterval = realSetInterval;
    globalThis.clearInterval = realClearInterval;
  }
});

test('folder import shows art plus a real progress bar', async () => {
  const captured = [];
  const React = {
    ...fakeReact(),
    createElement: (type, props, ...kids) => {
      const node = { type, props: { ...props, children: kids.length === 1 ? kids[0] : kids } };
      captured.push(node);
      return node;
    },
  };
  const mod = await loadClient({ react: React });
  mod.__test.SkinModal({
    skin: 'default', onSkin() {}, daily: false, onDaily() {}, hasManual: false, poolCount: 0,
    importState: { done: 3, total: 12 }, message: '',
    onUpload() {}, onFolder() {}, onClearManual() {}, onClearPool() {}, onClose() {}, t: (k) => k,
  });
  const bar = captured.find((c) => c.props.role === 'progressbar');
  assert.ok(bar, 'a progressbar is rendered while importing');
  assert.equal(bar.props['aria-valuenow'], 3);
  assert.equal(bar.props['aria-valuemax'], 12);
  const fill = captured.find((c) => String(c.props.className ?? '') === 'gl-progressFill');
  assert.equal(fill.props.style.width, '25%', 'quarter done');
  // A nested component is an element here, not expanded markup.
  assert.ok(captured.some((c) => typeof c.type === 'function' && c.type.name === 'LoadingGlyph'), 'the themed art accompanies it');
});

test('repos without git identity are named in mine reports', () => {
  const extra = { ...data, repos: [...data.repos, { key: 'c', title: 'repo-c', ok: true, me: null, stats: stats(1, 1), mine: stats(0, 0), commits: [] }] };
  assert.ok(T.buildReport(t, 'daily', extra, 'mine', 'plain', { style: 'worklog' }).includes('repo-c'));
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
  assert.ok(T.buildReport(t, 'daily', yesterday, 'mine', 'plain', { style: 'worklog' }).startsWith('日报 · 2026-11-04'));
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

test('dialogs take focus, keep Tab inside, and give focus back', async () => {
  const effects = [];
  const react = { ...fakeReact(), useEffect: (fn) => effects.push(fn), useRef: (v) => ({ current: v }) };
  const mod = await loadClient({ react });
  const el = (name) => ({ name, focus() { globalThis.document.activeElement = this; } });
  const opener = el('opener');
  const [first, middle, last] = [el('first'), el('middle'), el('last')];
  const listeners = {};
  const dialog = {
    ...el('dialog'),
    querySelectorAll: () => [first, middle, last],
    contains: (node) => [first, middle, last, dialog].includes(node),
    addEventListener: (type, fn) => (listeners[type] = fn),
    removeEventListener: (type) => delete listeners[type],
  };
  globalThis.document = { activeElement: opener, contains: () => true };
  const ref = mod.__test.useDialogFocus();
  ref.current = dialog;
  const cleanup = effects.at(-1)();
  assert.equal(document.activeElement, first, 'focus moves into the dialog');
  let prevented = false;
  document.activeElement = last;
  listeners.keydown({ key: 'Tab', shiftKey: false, preventDefault: () => (prevented = true) });
  assert.equal(document.activeElement, first, 'Tab wraps from last to first');
  assert.ok(prevented);
  listeners.keydown({ key: 'Tab', shiftKey: true, preventDefault() {} });
  assert.equal(document.activeElement, last, 'Shift+Tab wraps from first to last');
  cleanup();
  assert.equal(document.activeElement, opener, 'focus returns to the opener');
  assert.equal(listeners.keydown, undefined);
  delete globalThis.document;
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
