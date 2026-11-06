/**
 * Shared test helpers: an isolated git sandbox, fixture repositories, a fake
 * Host context, and a loader for the browser half.
 *
 * Importing this module points HOME at a throwaway directory, so neither the
 * fixtures nor the plugin's own git calls read the developer's global config.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const ROOT = new URL('..', import.meta.url).pathname;

export const SANDBOX = mkdtempSync(join(tmpdir(), 'ganleme-test-'));
const HOME = join(SANDBOX, 'home');
mkdirSync(HOME, { recursive: true });
writeFileSync(
  join(HOME, '.gitconfig'),
  '[user]\n\tname = 张三\n\temail = zhang@dev.local\n[init]\n\tdefaultBranch = main\n',
);
process.env.HOME = HOME;
process.env.GIT_CONFIG_NOSYSTEM = '1';
// The plugin keeps update status in os.tmpdir(); never touch the real one,
// or a running plugin on this machine would report a test failure.
mkdirSync(join(SANDBOX, 'tmp'), { recursive: true });
process.env.TMPDIR = join(SANDBOX, 'tmp');
process.on('exit', () => rmSync(SANDBOX, { recursive: true, force: true }));

/** Local calendar date `offset` days from today, as YYYY-MM-DD. */
export function day(offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** git date in local time: `at(-2, '10:00')`. */
export const at = (offset, time = '10:00') => `${day(offset)} ${time}:00`;

export function git(dir, args, env = {}) {
  return execFileSync('git', ['-C', dir, ...args], { env: { ...process.env, ...env }, encoding: 'utf8' }).trim();
}

let repoCounter = 0;
/** A fresh repository under the sandbox; returns its path. */
export function makeRepo(name = `repo${++repoCounter}`) {
  const dir = join(SANDBOX, 'repos', name);
  mkdirSync(dir, { recursive: true });
  git(dir, ['init', '-q']);
  return dir;
}

/**
 * Commit a file change. `date` is the committer date; `authorDate` defaults
 * to it. `email`/`name` override the author identity.
 */
export function commit(dir, { file = `f${Math.random().toString(36).slice(2)}.txt`, content = 'x\n', message = 'change', date, authorDate, email, name } = {}) {
  writeFileSync(join(dir, file), content);
  git(dir, ['add', '-A']);
  const env = {};
  if (date) env.GIT_COMMITTER_DATE = date;
  if (authorDate || date) env.GIT_AUTHOR_DATE = authorDate ?? date;
  if (email) env.GIT_AUTHOR_EMAIL = email;
  if (name) env.GIT_AUTHOR_NAME = name;
  git(dir, ['commit', '-q', '--allow-empty', '-m', message], env);
  return git(dir, ['rev-parse', 'HEAD']);
}

/** Import the Host half fresh, so module-level state never leaks between tests. */
export async function loadHost() {
  return import(pathToFileURL(join(ROOT, 'index.js')).href + `?t=${Date.now()}${Math.random()}`);
}

/**
 * A fake Host context. `services` adds optional services such as
 * `pluginManager`; `ctx.inject(deps, cb)` runs `cb` only when every dep exists,
 * mirroring Cordis sub-plugin activation.
 */
export async function makeHost({ workspaces = [], config = {}, services = {} } = {}) {
  const host = await loadHost();
  const routes = new Map();
  const base = {
    webServer: {
      register: (route) => {
        routes.set(route.path, route);
        return () => routes.delete(route.path);
      },
    },
    connection: { requestRejection: () => undefined },
    workspaceRegistry: { list: () => (typeof workspaces === 'function' ? workspaces() : workspaces) },
    subprocess: { resolveExecutable: async () => 'git' },
    ...services,
  };
  const ctx = {
    ...base,
    effect(setup) {
      return setup();
    },
    inject(deps, callback) {
      if (deps.every((name) => base[name] !== undefined)) callback(ctx);
    },
  };
  const resolved = host.Config(config);
  host.apply(ctx, resolved);

  async function call(path, { method = 'GET', body } = {}) {
    const route = routes.get(path.split('?')[0]);
    if (!route) return { status: 404, json: null };
    const res = {
      statusCode: 0,
      headers: {},
      body: '',
      setHeader(key, value) {
        this.headers[key.toLowerCase()] = value;
      },
      end(payload) {
        this.body = payload ?? '';
      },
    };
    const req = {
      method,
      url: path,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      async *[Symbol.asyncIterator]() {
        if (body !== undefined) yield Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
      },
    };
    await route.handler(req, res);
    return { status: res.statusCode, json: res.body ? JSON.parse(res.body) : null, headers: res.headers };
  }

  return { host, ctx, routes, call, config: resolved };
}

/** Stats for a custom window, or a preset range when `range` is given. */
export async function stats(call, { from, to, range } = {}) {
  const query = range ? `range=${range}` : `range=custom&from=${from}&to=${to}`;
  return call(`/ganleme/stats?${query}`);
}

/**
 * Load the browser half with a minimal React and window stub.
 * @returns the factory result: `{ inject, apply, __test }`.
 */
export async function loadClient({ react, storage } = {}) {
  const store = storage ?? new Map();
  let captured = null;
  globalThis.window = {
    __ModuleLoader__: { load: (mod) => (captured = mod) },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    addEventListener() {},
    removeEventListener() {},
    location: { reload() {} },
  };
  await import(pathToFileURL(join(ROOT, 'client.js')).href + `?t=${Date.now()}${Math.random()}`);
  const React = react ?? fakeReact();
  return captured.factory((name) => {
    if (name === 'react') return React;
    throw new Error(`unexpected require: ${name}`);
  });
}

/** A React stand-in that returns initial state and records nothing. */
export function fakeReact(forcedState = {}) {
  let index = 0;
  return {
    createElement: (...args) => ({ el: args }),
    useState: (initial) => {
      const i = index++;
      const value = i in forcedState ? forcedState[i] : typeof initial === 'function' ? initial() : initial;
      return [value, () => {}];
    },
    useEffect() {},
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
  };
}
