/** AI polish: prompt construction and the guard that keeps numbers honest. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHost, loadHost } from './helpers.mjs';

const host = await loadHost();
const { buildPolishPrompt, extractNumbers, checkPolishNumbers, POLISH_LEVELS, POLISH_TONES } = host;
const REPORT = [
  '日报 · 2026-11-05',
  '',
  '本期共提交 3 次，新增 128 行，删除 24 行，涉及 1 个仓库。',
  '',
  'repo-a',
  '  - 修复登录状态丢失的问题',
  '  - 支持按仓库筛选',
];
const TEXT = REPORT.join('\n');


test('numbers are extracted as written', () => {
  // A dotted version splits into its numeric runs: stricter is safer here.
  assert.deepEqual([...extractNumbers('3 次，128 行，-24，1.5 小时，v0.3.0')].sort(), ['0', '0.3', '1.5', '128', '24', '3'].sort());
  assert.deepEqual([...extractNumbers('没有数字')], []);
  assert.deepEqual([...extractNumbers('')], []);
});

test('a candidate may reword but not introduce numbers', () => {
  const reworded = '日报 · 2026-11-05\n\n本期完成 3 次提交，新增 128 行、删除 24 行，覆盖 1 个仓库。\n\nrepo-a\n  · 修复了登录状态丢失\n  · 支持按仓库筛选';
  assert.deepEqual(checkPolishNumbers(REPORT, reworded), { ok: true, extra: [] });
  // Dropping numbers is allowed: a summary may omit line counts.
  assert.equal(checkPolishNumbers(REPORT, '本期完成 3 次提交。').ok, true);
});

test('invented numbers are rejected and named', () => {
  for (const [candidate, bad] of [
    ['本期共提交 5 次，新增 128 行，删除 24 行，涉及 1 个仓库。', ['5']],
    ['本期共提交 3 次，新增 128 行，删除 24 行，涉及 2 个仓库。', ['2']],
    ['新增三处改进，提交 3 次，128 行，24 行，1 个仓库。', ['三']], // CJK numeral is not a digit: allowed
  ]) {
    const result = checkPolishNumbers(REPORT, candidate);
    if (bad[0] === '三') {
      assert.equal(result.ok, true, 'CJK numerals are not extracted, so they cannot trip the guard');
    } else {
      assert.equal(result.ok, false);
      assert.deepEqual(result.extra, bad);
    }
  }
});

test('a swept number such as a date is not treated as invented', () => {
  const candidate = REPORT.join('\n').replace('本期共提交 3 次', '2026-11-05 提交 3 次');
  const result = checkPolishNumbers(REPORT, candidate);
  // 2026, 11, 05 already appear in the title line.
  assert.equal(result.ok, true, JSON.stringify(result));
});

test('the prompt pins facts, numbers, names and language', () => {
  const prompt = buildPolishPrompt({ level: 'items', tone: 'plain', language: 'zh' });
  assert.match(prompt, /editing a work report, not writing a new one/);
  assert.match(prompt, /must stay exactly as written/);
  assert.match(prompt, /Do not change repository names/);
  assert.match(prompt, /Write the result in Chinese/);
  assert.match(prompt, /Rewrite the wording of each bullet/);
  assert.match(buildPolishPrompt({ language: 'en' }), /Write the result in English/);
});

test('each level changes only the structural instruction', () => {
  const byLevel = Object.fromEntries(POLISH_LEVELS.map((level) => [level, buildPolishPrompt({ level })]));
  assert.match(byLevel.items, /exact number of bullets/);
  assert.match(byLevel.paragraph, /Merge the bullets of each repository into one connected paragraph/);
  assert.match(byLevel.summary, /single sentence/);
  for (const text of Object.values(byLevel)) {
    assert.match(text, /must stay exactly as written/, 'every level keeps the number rule');
    assert.match(text, /Never add, guess, or evaluate/);
  }
});

test('every tone has its own register line', () => {
  const tones = POLISH_TONES.map((tone) => buildPolishPrompt({ tone }));
  assert.equal(new Set(tones).size, POLISH_TONES.length);
  assert.match(tones[POLISH_TONES.indexOf('report')], /formal status-report register/);
});

test('unknown ids fall back instead of failing', () => {
  const prompt = buildPolishPrompt({ level: 'nope', tone: 'nope', language: 'fr' });
  assert.match(prompt, /Rewrite the wording of each bullet/);
  assert.match(prompt, /Write plainly and directly/);
  assert.match(prompt, /Write the result in Chinese/, 'unknown language falls back to zh');
});

test('a user note is appended and cannot override the hard rules', () => {
  const prompt = buildPolishPrompt({ note: '面向技术负责人，突出架构改动' });
  assert.match(prompt, /Extra guidance from the user/);
  assert.match(prompt, /面向技术负责人，突出架构改动/);
  assert.match(prompt, /within the hard rules above/);
  assert.ok(prompt.indexOf('must stay exactly as written') < prompt.indexOf('Extra guidance'));
  assert.doesNotMatch(buildPolishPrompt({ note: '   ' }), /Extra guidance/);
});

/** A fake `llm` service that streams one canned answer. */
function fakeLlm(answer, { finish = { kind: 'stop' }, fail = false } = {}) {
  const calls = [];
  return {
    calls,
    listProviders: () => [{ id: 'fake', name: 'Fake' }],
    async *stream(options) {
      calls.push(options);
      if (fail) throw new Error('provider exploded');
      for (const piece of String(answer).split(/(?<=\s)/)) {
        if (piece) yield { type: 'text-delta', index: 0, text: piece };
      }
      yield { type: 'finish', reason: finish };
    },
  };
}

test('polish streams a rewrite and reports done', async () => {
  const answer = '本期完成 3 次提交，新增 128 行、删除 24 行，覆盖 1 个仓库。';
  const llm = fakeLlm(answer);
  const { callStream } = await makeHost({ services: { llm } });
  const { status, frames } = await callStream('/ganleme/polish', {
    body: { text: TEXT, provider: 'fake', model: 'fake-1', level: 'paragraph', tone: 'report', language: 'zh' },
  });
  assert.equal(status, 200);
  const streamed = frames.filter((f) => f.type === 'delta').map((f) => f.text).join('');
  assert.equal(streamed, answer);
  assert.deepEqual(frames.at(-1), { type: 'done', provider: 'fake', model: 'fake-1' });
  const sent = llm.calls[0];
  assert.equal(sent.provider, 'fake');
  assert.equal(sent.model, 'fake-1');
  assert.equal(sent.maxTokens, 2000);
  assert.match(sent.system, /Merge the bullets of each repository/);
  assert.match(sent.system, /formal status-report register/);
  assert.equal(sent.messages[0].content[0].text, TEXT);
  assert.equal(sent.purpose, 'ganleme-polish');
});

test('a rewrite that invents numbers is rejected, not delivered as done', async () => {
  const llm = fakeLlm('本期共提交 9 次，新增 128 行。');
  const { callStream } = await makeHost({ services: { llm } });
  const { frames } = await callStream('/ganleme/polish', { body: { text: TEXT, provider: 'fake', model: 'm' } });
  const last = frames.at(-1);
  assert.equal(last.type, 'rejected');
  assert.equal(last.code, 'numbers-changed');
  assert.deepEqual(last.extra, ['9']);
  assert.ok(!frames.some((f) => f.type === 'done'), 'never reports success');
});

test('without the llm service the route says so', async () => {
  const { call } = await makeHost();
  const res = await call('/ganleme/polish', { method: 'POST', body: { text: TEXT } });
  assert.equal(res.status, 501);
  assert.equal(res.json.code, 'llm-unavailable');
});

test('a missing model route is refused with a reason', async () => {
  const llm = fakeLlm('x');
  const { call } = await makeHost({ services: { llm } });
  const res = await call('/ganleme/polish', { method: 'POST', body: { text: TEXT } });
  assert.equal(res.status, 422);
  assert.equal(res.json.code, 'no-model');
});

test('the config can pin a model when the client sends none', async () => {
  const llm = fakeLlm('本期完成 3 次提交。');
  const { callStream } = await makeHost({ services: { llm }, config: { polishModel: 'pinned-1' } });
  const { frames } = await callStream('/ganleme/polish', { body: { text: TEXT } });
  assert.equal(frames.at(-1).type, 'done');
  assert.equal(llm.calls[0].model, 'pinned-1');
});

test('an empty text is refused', async () => {
  const llm = fakeLlm('x');
  const { call } = await makeHost({ services: { llm } });
  assert.equal((await call('/ganleme/polish', { method: 'POST', body: { text: '   ' } })).status, 400);
});

test('a provider failure becomes an error frame', async () => {
  const llm = fakeLlm('x', { fail: true });
  const { callStream } = await makeHost({ services: { llm } });
  const { frames } = await callStream('/ganleme/polish', { body: { text: TEXT, provider: 'fake', model: 'm' } });
  assert.equal(frames.at(-1).type, 'error');
  assert.match(frames.at(-1).message, /provider exploded/);
});

test('a model error finish becomes an error frame', async () => {
  const llm = fakeLlm('部分', { finish: { kind: 'error', failure: { code: 'x', message: 'rate limited' } } });
  const { callStream } = await makeHost({ services: { llm } });
  const { frames } = await callStream('/ganleme/polish', { body: { text: TEXT, provider: 'fake', model: 'm' } });
  assert.equal(frames.at(-1).type, 'error');
  assert.match(frames.at(-1).message, /rate limited/);
});

test('a caller-supplied prompt is used verbatim', async () => {
  const llm = fakeLlm('本期完成 3 次提交。');
  const { callStream } = await makeHost({ services: { llm } });
  await callStream('/ganleme/polish', { body: { text: TEXT, provider: 'fake', model: 'm', system: 'CUSTOM RULES' } });
  assert.equal(llm.calls[0].system, 'CUSTOM RULES');
});

test('the Session route is taken from a live Agent when nothing is pinned', async () => {
  const llm = fakeLlm('本期完成 3 次提交。');
  const agents = {
    list: () => [
      { status: 'inactive', session: { requestHeader: () => ({ config: { provider: 'cold', model: 'cold-1' } }) } },
      { status: 'running', session: { requestHeader: () => ({ config: { provider: 'live', model: 'live-1' } }) } },
    ],
  };
  const { callStream } = await makeHost({ services: { llm, agents } });
  const { frames } = await callStream('/ganleme/polish', { body: { text: TEXT } });
  assert.equal(frames.at(-1).type, 'done');
  assert.equal(llm.calls[0].provider, 'live', 'a running Agent is preferred');
  assert.equal(llm.calls[0].model, 'live-1');
});

test('an Agent without a complete route is skipped', async () => {
  const llm = fakeLlm('本期完成 3 次提交。');
  const agents = {
    list: () => [
      { status: 'running', session: { requestHeader: () => undefined } },
      { status: 'inactive', session: { requestHeader: () => ({ config: { provider: 'ok', model: 'ok-1' } }) } },
    ],
  };
  const { callStream } = await makeHost({ services: { llm, agents } });
  await callStream('/ganleme/polish', { body: { text: TEXT } });
  assert.equal(llm.calls[0].model, 'ok-1');
});

test('meta advertises polish only when the Host can do it', async () => {
  const llm = fakeLlm('x');
  assert.equal((await makeHost({ services: { llm } }).then((h) => h.call('/ganleme/meta'))).json.polish, true);
  assert.equal((await makeHost().then((h) => h.call('/ganleme/meta'))).json.polish, false);
});
