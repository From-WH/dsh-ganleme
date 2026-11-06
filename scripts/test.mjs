#!/usr/bin/env node
/**
 * Test runner: unit tests under the current Node, then the Cordis integration
 * test under the DeepSeek Harness app's Electron binary (it can read the app's
 * asar archive). The integration step is skipped when the app is absent.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const testDir = join(root, 'test');
const units = readdirSync(testDir).filter((f) => f.endsWith('.test.mjs')).map((f) => join(testDir, f));

let failed = false;
const run = (bin, args, env = {}) => {
  const r = spawnSync(bin, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) failed = true;
};

run(process.execPath, ['--test', ...units]);

const electron = '/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness';
if (existsSync(electron)) {
  run(electron, ['--test', join(testDir, 'cordis.integration.mjs')], { ELECTRON_RUN_AS_NODE: '1' });
} else {
  console.log('# cordis integration skipped: DeepSeek Harness app not installed');
}

process.exit(failed ? 1 : 0);
