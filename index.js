/**
 * 干了么 (Git Pulse) — Host half.
 *
 * Serves two authenticated routes on the composition's web server:
 *   GET /ganleme/repos  — every workspace/extra git repository with stats coverage
 *   GET /ganleme/stats  — aggregated commit + line-change statistics per range
 *
 * Security follows the open-in-app pattern: every route first asks the
 * composition's `connection` service for a rejection (Host/Origin fence and
 * browser authentication) before any repository path is touched.
 *
 * Repositories come from two sources:
 *   1. the Harness workspace registry (`workspaceRegistry.list()`); a workspace
 *      directory that is itself a git repository counts once, otherwise its
 *      immediate subdirectories are scanned for repositories;
 *   2. `config.extraRoots` directories, scanned the same one-level way.
 */
import { execFile } from 'node:child_process';
import { readdir, realpath, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import z from './vendor/schemastery.mjs';

/** Cordis function-plugin name. */
export const name = 'ganleme';

/** The route carrier, the trust fence, the workspace registry, and the PATH resolver. */
export const inject = ['webServer', 'connection', 'workspaceRegistry', 'subprocess', 'configEditor', 'directoryPickerController'];

export const Config = z.object({
  /** Additional directories scanned for git repositories (see scanDepth). */
  extraRoots: z.array(z.string()).default([]),
  /** Directory paths excluded from statistics (exact path or prefix). */
  excludedPaths: z.array(z.string()).default([]),
  /** How many directory levels below a root to search for git repositories. */
  scanDepth: z.number().min(1).max(3).default(1),
  /** Maximum commits read per repository per query. */
  commitLimit: z.number().default(5000),
  /** How long statistics stay cached before git runs again (ms). */
  cacheMs: z.number().default(60_000),
  /** Override for "my" author email; beats each repository's git user.email. */
  myEmail: z.string().default(''),
  /** Override for "my" author name; used when no email identity resolves. */
  myName: z.string().default(''),
  /** npm package name this plugin publishes under; empty disables remote updates. */
  updatePackage: z.string().default('dsh-ganleme'),
  /** Registry asked for the latest version lookup; installs follow the profile's registry plan. */
  updateRegistry: z.string().default('https://registry.npmjs.org/'),
});

const RANGES = new Set(['today', 'yesterday', 'week', 'month']);
const FIELD = '\u0002';
const RECORD = '\u0001';
/** Repos listing cache lifetime; cheaper than the stats cache. */
const REPOS_CACHE_MS = 15_000;
/** Per-repository commit list kept for the UI detail view. */
const COMMIT_LIST_CAP = 200;
/** git log upper bound; a repository cannot exceed this per query. */
const GIT_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Time windows (Host-local calendar; "week" starts on Monday)
// ---------------------------------------------------------------------------

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function windowFor(range, now = new Date()) {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (range) {
    case 'today':
      return { from: today, to: tomorrow };
    case 'yesterday':
      return { from: addDays(today, -1), to: today };
    case 'week': {
      // Monday = 0 … Sunday = 6
      const weekday = (now.getDay() + 6) % 7;
      return { from: addDays(today, -weekday), to: tomorrow };
    }
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: tomorrow };
    default:
      return null;
  }
}

/** ISO 8601 with the process-local offset; git's --since parses this form. */
function isoLocal(date) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) +
    sign + pad(Math.floor(abs / 60)) + pad(abs % 60)
  );
}

// ---------------------------------------------------------------------------
// git execution and log parsing
// ---------------------------------------------------------------------------

function runGit(git, args, cwd, timeoutMs) {
  return new Promise((resolve) => {
    execFile(git, args, { cwd, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        resolve({ ok: false, error: String(stderr || error.message || 'git failed').trim().slice(0, 300) });
      } else {
        resolve({ ok: true, stdout: String(stdout) });
      }
    });
  });
}

/**
 * Parse `git log --pretty=format:%x01%H%x02%h%x02%an%x02%ae%x02%at%x02%s
 * --numstat` output into commit records, filtered to the statistics window.
 * `isMine({ name, email })` flags the caller's own commits; when absent every
 * commit is marked not-mine.
 */
export function parseLog(stdout, window, isMine = null) {
  const commits = [];
  if (!stdout) return commits;
  for (const block of stdout.split(RECORD)) {
    if (!block) continue;
    const newline = block.indexOf('\n');
    const headLine = newline === -1 ? block : block.slice(0, newline);
    const body = newline === -1 ? '' : block.slice(newline + 1);
    const parts = headLine.split(FIELD);
    if (parts.length < 6) continue;
    const [full, short, author, email, at, subject] = parts;
    const ts = Number(at) * 1000;
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const date = new Date(ts);
    if (date < window.from || date >= window.to) continue;
    let insertions = 0;
    let deletions = 0;
    const files = [];
    for (const line of body.split('\n')) {
      if (!line.trim()) continue;
      const columns = line.split('\t');
      if (columns.length < 3) continue;
      const [ins, del, rawPath] = columns;
      // Rename entries render as "old => new" or "prefix/{old => new}".
      const file = rawPath.includes(' => ')
        ? (rawPath.split(' => ').pop() ?? '').replace(/\}\s*$/, '')
        : rawPath;
      if (file) files.push(file);
      if (ins !== '-') insertions += Number(ins) || 0;
      if (del !== '-') deletions += Number(del) || 0;
    }
    commits.push({
      hash: short || full.slice(0, 7),
      author,
      email,
      subject,
      time: date.toISOString(),
      mine: isMine ? isMine({ name: author, email }) : false,
      insertions,
      deletions,
      files: files.length,
      paths: files.slice(0, 8),
    });
  }
  commits.sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
  return commits;
}

function aggregate(commits) {
  let insertions = 0;
  let deletions = 0;
  let files = 0;
  const authors = new Map();
  for (const commit of commits) {
    insertions += commit.insertions;
    deletions += commit.deletions;
    files += commit.files ?? 0;
    authors.set(commit.author, (authors.get(commit.author) ?? 0) + 1);
  }
  return {
    commits: commits.length,
    insertions,
    deletions,
    // Count of file changes (a file touched by two commits counts twice).
    files,
    authors: [...authors.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ---------------------------------------------------------------------------
// Repository discovery
// ---------------------------------------------------------------------------

async function dirExists(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function isGitRepo(path) {
  try {
    await stat(join(path, '.git'));
    return true;
  } catch {
    return false;
  }
}

async function expandHome(path) {
  if (path === '~') return homedir();
  if (path.startsWith('~/') || path.startsWith('~\\')) return join(homedir(), path.slice(2));
  return path;
}

/**
 * Collect repositories: Harness workspaces first, then configured extra roots.
 * A directory that is itself a repository counts once (and is not descended
 * into); otherwise subdirectories are searched down to `config.scanDepth`
 * levels, skipping hidden entries and bounding total directories visited.
 */
export async function listRepos(ctx, config) {
  const excluded = (config.excludedPaths ?? []).map((p) => p.replace(/[\\/]+$/, ''));
  const isExcluded = (path) =>
    excluded.some((x) => path === x || path.startsWith(x + sep) || path.startsWith(x + '/'));
  const repos = [];
  const seen = new Set();
  const state = { visited: 0, cap: 1500 };
  const depth = Math.min(3, Math.max(1, Math.round(Number(config.scanDepth) || 1)));

  const push = async (path, title, source) => {
    const canon = await realpath(path).catch(() => path);
    if (!canon || seen.has(canon) || isExcluded(canon)) return;
    seen.add(canon);
    repos.push({ key: Buffer.from(canon, 'utf8').toString('base64url'), path: canon, title, source });
  };

  /** Level-limited recursive search below `dir`; found repos are boundaries. */
  const scanFrom = async (dir, levels, source) => {
    if (levels <= 0 || state.visited >= state.cap) return;
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (state.visited >= state.cap) return;
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      state.visited += 1;
      const sub = join(dir, entry.name);
      if (await isGitRepo(sub)) {
        await push(sub, entry.name, source);
      } else if (levels > 1) {
        await scanFrom(sub, levels - 1, source);
      }
    }
  };

  let workspaces = [];
  try {
    workspaces = ctx.workspaceRegistry.list() ?? [];
  } catch {
    workspaces = [];
  }
  for (const workspace of workspaces) {
    const raw = workspace?.path;
    if (!raw || !isAbsolute(raw) || !(await dirExists(raw))) continue;
    const canon = await realpath(raw).catch(() => raw);
    if (await isGitRepo(canon)) await push(canon, workspace.title || basename(canon), 'workspace');
    else await scanFrom(canon, depth, 'workspace');
  }

  for (const root of config.extraRoots ?? []) {
    const expanded = await expandHome(String(root));
    if (!isAbsolute(expanded) || !(await dirExists(expanded))) continue;
    const canon = await realpath(expanded).catch(() => expanded);
    if (await isGitRepo(canon)) {
      await push(canon, basename(canon), 'extra');
      continue;
    }
    await scanFrom(canon, depth, 'extra');
  }

  return repos;
}

// ---------------------------------------------------------------------------
// Statistics build
// ---------------------------------------------------------------------------

/**
 * Resolve "my" identity for one repository. A configured `myEmail`/`myName`
 * beats the repository's git config; the email identity wins over the name
 * so a colleague who happens to share the display name is never counted.
 */
async function resolveIdentity(git, repo, config) {
  const [emailRun, nameRun] = await Promise.all([
    runGit(git, ['-C', repo.path, 'config', 'user.email'], repo.path, 5_000),
    runGit(git, ['-C', repo.path, 'config', 'user.name'], repo.path, 5_000),
  ]);
  const repoEmail = emailRun.ok ? emailRun.stdout.trim() : '';
  const repoName = nameRun.ok ? nameRun.stdout.trim() : '';
  const email = (config.myEmail || repoEmail).trim();
  const name = (config.myName || repoName).trim();
  if (!email && !name) return null;
  return { email: email || null, name: name || null };
}

async function repoStats(git, repo, window, config) {
  const args = [
    '-C', repo.path,
    'log',
    `--pretty=format:${RECORD}%H${FIELD}%h${FIELD}%an${FIELD}%ae${FIELD}%at${FIELD}%s`,
    '--numstat',
    '--since=' + isoLocal(window.from),
    `--max-count=${Math.max(1, config.commitLimit)}`,
  ];
  const [logRun, branchRun, me] = await Promise.all([
    runGit(git, args, repo.path, GIT_TIMEOUT_MS),
    runGit(git, ['-C', repo.path, 'rev-parse', '--abbrev-ref', 'HEAD'], repo.path, 10_000),
    resolveIdentity(git, repo, config),
  ]);
  if (!logRun.ok) {
    return { ...repo, ok: false, error: logRun.error };
  }
  const isMine = me
    ? ({ email, name }) => (me.email ? email === me.email : name === me.name)
    : null;
  const commits = parseLog(logRun.stdout, window, isMine);
  return {
    ...repo,
    ok: true,
    me,
    branch: branchRun.ok ? branchRun.stdout.trim() || null : null,
    stats: aggregate(commits),
    mine: aggregate(commits.filter((commit) => commit.mine)),
    commits: commits.slice(0, COMMIT_LIST_CAP),
    commitsTotal: commits.length,
  };
}

/** Sum aggregate objects into one totals object. */
function sumStats(list) {
  const totals = { commits: 0, insertions: 0, deletions: 0, files: 0, authors: [] };
  const authors = new Map();
  for (const stats of list) {
    totals.commits += stats.commits;
    totals.insertions += stats.insertions;
    totals.deletions += stats.deletions;
    totals.files += stats.files;
    for (const author of stats.authors) {
      authors.set(author.name, (authors.get(author.name) ?? 0) + author.count);
    }
  }
  totals.authors = [...authors.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return totals;
}

function buildTotals(results) {
  const ok = results.filter((repo) => repo.ok);
  const totals = sumStats(ok.map((repo) => repo.stats));
  totals.repos = ok.filter((repo) => repo.stats.commits > 0).length;
  // "Mine" totals only cover repositories with a resolvable git identity:
  // without one, nobody's commits can be attributed to the caller.
  const mine = sumStats(ok.filter((repo) => repo.me).map((repo) => repo.mine));
  mine.repos = ok.filter((repo) => repo.me && repo.mine.commits > 0).length;
  return { totals, mine };
}

// ---------------------------------------------------------------------------
// Self-update: check the npm registry and reinstall through pluginManager
// ---------------------------------------------------------------------------

const UPDATE_ROUTE = '/ganleme/update';
const UPDATE_TIMEOUT_MS = 8_000;

/** This bundle's own package.json version, read once. */
const currentVersion = (() => {
  let version = null;
  return () => {
    if (version === null) {
      try {
        version = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8')).version ?? '0.0.0';
      } catch {
        version = '0.0.0';
      }
    }
    return version;
  };
})();

/** Prerelease-aware SemVer comparison (npm ordering), sufficient for dist-tags. */
export function compareVersions(a, b) {
  const [mainA, preA] = String(a).split('-', 2);
  const [mainB, preB] = String(b).split('-', 2);
  const partsA = mainA.split('.');
  const partsB = mainB.split('.');
  for (let i = 0; i < 3; i += 1) {
    const x = Number(partsA[i] ?? 0);
    const y = Number(partsB[i] ?? 0);
    if (x !== y) return x - y;
  }
  if (preA === preB) return 0;
  if (preA === undefined) return 1;
  if (preB === undefined) return -1;
  const idsA = preA.split('.');
  const idsB = preB.split('.');
  const len = Math.max(idsA.length, idsB.length);
  for (let i = 0; i < len; i += 1) {
    const x = idsA[i];
    const y = idsB[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const numericX = /^\d+$/.test(x);
    const numericY = /^\d+$/.test(y);
    if (numericX && numericY) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) return diff;
    } else if (numericX) return -1;
    else if (numericY) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

async function fetchLatestVersion(pkg, registry) {
  const base = registry.replace(/\/+$/, '/');
  const response = await fetch(base + encodeURIComponent(pkg), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(UPDATE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`registry answered HTTP ${response.status}`);
  const doc = await response.json();
  const latest = doc && doc['dist-tags'] ? doc['dist-tags'].latest : undefined;
  return typeof latest === 'string' && latest.length > 0 ? latest : null;
}

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------

export function apply(ctx, config) {
  const resolvedGit = (() => {
    let promise = null;
    return () => {
      promise ??= (async () => {
        try {
          return (await ctx.subprocess?.resolveExecutable?.('git')) || 'git';
        } catch {
          return 'git';
        }
      })();
      return promise;
    };
  })();

  /** range -> { expires, promise }; `refresh` re-runs git and restarts the TTL. */
  const statsCache = new Map();
  let reposCache = null;

  const cachedRepos = (refresh) => {
    const now = Date.now();
    if (!refresh && reposCache && reposCache.expires > now) return reposCache.promise;
    const promise = listRepos(ctx, config);
    reposCache = { expires: now + REPOS_CACHE_MS, promise };
    return promise;
  };

  const cachedStats = (range, refresh) => {
    const now = Date.now();
    const hit = statsCache.get(range);
    if (!refresh && hit && hit.expires > now) return hit.promise;
    const promise = (async () => {
      const window = windowFor(range, new Date());
      const repos = await cachedRepos(refresh);
      const git = await resolvedGit();
      const results = await Promise.all(repos.map((repo) => repoStats(git, repo, window, config)));
      const { totals, mine } = buildTotals(results);
      return {
        range,
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        generatedAt: new Date().toISOString(),
        totals,
        mine,
        repos: results,
      };
    })();
    statsCache.set(range, { expires: now + Math.max(5_000, config.cacheMs), promise });
    return promise;
  };

  /** Answer an untrusted/unauthenticated request; true when it was rejected. */
  const rejected = (req, res) => {
    const rejection = ctx.connection.requestRejection(req);
    if (rejection === undefined) return false;
    res.statusCode = rejection;
    res.end();
    return true;
  };

  const sendJson = (res, status, payload) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.end(JSON.stringify(payload));
  };

  const sendMethodNotAllowed = (res, allow) => {
    res.statusCode = 405;
    res.setHeader('allow', allow);
    res.end();
  };

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/ganleme/repos',
        handler: async (req, res) => {
          if (rejected(req, res)) return;
          if (req.method !== 'GET') return sendMethodNotAllowed(res, 'GET');
          try {
            sendJson(res, 200, { generatedAt: new Date().toISOString(), repos: await cachedRepos(false) });
          } catch (error) {
            sendJson(res, 500, { code: 'repos-failed', message: String(error?.message ?? error) });
          }
        },
      }),
    'ganleme: GET /ganleme/repos',
  );

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/ganleme/stats',
        handler: async (req, res) => {
          if (rejected(req, res)) return;
          if (req.method !== 'GET') return sendMethodNotAllowed(res, 'GET');
          const url = new URL(String(req.url), 'http://localhost');
          const range = url.searchParams.get('range') ?? 'today';
          const refresh = url.searchParams.get('refresh') === '1';
          if (!RANGES.has(range)) {
            sendJson(res, 400, { code: 'bad-range', message: 'range must be one of today|yesterday|week|month' });
            return;
          }
          try {
            sendJson(res, 200, await cachedStats(range, refresh));
          } catch (error) {
            sendJson(res, 500, { code: 'stats-failed', message: String(error?.message ?? error) });
          }
        },
      }),
    'ganleme: GET /ganleme/stats',
  );

  // --- remote update: meta, check, and detached reinstall -----------------
  // Installing another version is a removal plus an installation, and the
  // removal stops this very plugin, so the handler answers first and the
  // update runs detached; the client polls /ganleme/meta for the new version.

  let updating = false;

  const updateConfigOf = () => {
    const pkg = String(config.updatePackage ?? '').trim();
    if (!pkg) return null;
    const registry = String(config.updateRegistry ?? '').trim() || 'https://registry.npmjs.org/';
    return { pkg, registry };
  };

  const performUpdate = async (pkg, latest) => {
    try {
      const manager = ctx.pluginManager;
      if (!manager || typeof manager.removeBundle !== 'function' || typeof manager.installBundle !== 'function') {
        console.error('[ganleme] update aborted: the pluginManager service is unavailable in this deployment');
        return;
      }
      console.info(`[ganleme] updating ${pkg} -> ${latest}: removing the installed bundle first`);
      await manager.removeBundle(pkg);
      const result = await manager.installBundle(`${pkg}@${latest}`);
      console.info(`[ganleme] update applied, application=${result?.application ?? 'unknown'}`);
    } catch (error) {
      console.error('[ganleme] update failed:', String(error?.message ?? error));
    } finally {
      updating = false;
    }
  };

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/ganleme/meta',
        handler: async (req, res) => {
          if (rejected(req, res)) return;
          if (req.method !== 'GET') return sendMethodNotAllowed(res, 'GET');
          const update = updateConfigOf();
          sendJson(res, 200, { version: currentVersion(), update: update ? { pkg: update.pkg } : null });
        },
      }),
    'ganleme: GET /ganleme/meta',
  );

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: UPDATE_ROUTE,
        handler: async (req, res) => {
          if (rejected(req, res)) return;
          if (req.method !== 'GET') return sendMethodNotAllowed(res, 'GET');
          if (updating) {
            sendJson(res, 409, { code: 'update-running', message: 'an update is already running' });
            return;
          }
          const update = updateConfigOf();
          if (!update) {
            sendJson(res, 501, { code: 'update-disabled', message: 'updatePackage is not configured' });
            return;
          }
          try {
            const latest = await fetchLatestVersion(update.pkg, update.registry);
            const current = currentVersion();
            sendJson(res, 200, {
              pkg: update.pkg,
              current,
              latest,
              updateAvailable: latest !== null && compareVersions(latest, current) > 0,
            });
          } catch (error) {
            sendJson(res, 502, { code: 'registry-unreachable', message: String(error?.message ?? error) });
          }
        },
      }),
    'ganleme: GET /ganleme/update',
  );

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/ganleme/update/install',
        handler: async (req, res) => {
          if (rejected(req, res)) return;
          if (req.method !== 'POST') return sendMethodNotAllowed(res, 'POST');
          const update = updateConfigOf();
          if (!update) {
            sendJson(res, 501, { code: 'update-disabled', message: 'updatePackage is not configured' });
            return;
          }
          if (updating) {
            sendJson(res, 409, { code: 'update-running', message: 'an update is already running' });
            return;
          }
          try {
            const latest = await fetchLatestVersion(update.pkg, update.registry);
            const current = currentVersion();
            if (latest === null || compareVersions(latest, current) <= 0) {
              sendJson(res, 200, { started: false, reason: 'up-to-date', current, latest });
              return;
            }
            updating = true;
            sendJson(res, 202, { started: true, pkg: update.pkg, from: current, to: latest });
            void performUpdate(update.pkg, latest);
          } catch (error) {
            sendJson(res, 502, { code: 'registry-unreachable', message: String(error?.message ?? error) });
          }
        },
      }),
    'ganleme: POST /ganleme/update/install',
  );

  // --- extra project roots: list / add / remove, persisted via configEditor ---
  // Directory picks land in the plugin row's `extraRoots` through the normal
  // Loader path, so they survive restarts and hot-reload into the statistics.

  const readBoundedBody = async (req, cap = 64 * 1024) => {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.byteLength;
      if (size > cap) {
        req.resume();
        return null;
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, size).toString('utf8');
  };

  const parseJsonBody = (text) => {
    try {
      const body = JSON.parse(text);
      return typeof body === 'object' && body !== null ? body : null;
    } catch {
      return null;
    }
  };

  const updateExtraRoots = async (mutate) => {
    const editor = ctx.configEditor;
    if (!editor || typeof editor.edit !== 'function' || typeof editor.entries !== 'function') {
      throw new Error('configEditor service unavailable in this deployment');
    }
    // entries() yields Loader entries; the profile row id lives at options.id.
    const all = editor.entries();
    const entry = all.find((e) => e && (e.options?.id === 'ganleme' || e.options?.name === 'dsh-ganleme'));
    if (!entry) throw new Error(`plugin entry not found in the config editor (entries: ${all.map((e) => e.options?.id ?? '?').join(', ') || 'none'})`);
    await editor.edit(entry, (current, inherited) => {
      const raw = Array.isArray(current.extraRoots)
        ? current.extraRoots
        : Array.isArray(inherited && inherited.extraRoots)
          ? inherited.extraRoots
          : (config.extraRoots ?? []);
      return { ...current, extraRoots: mutate(raw.map(String)) };
    });
  };

  const handleRootsMutation = async (req, res, mode) => {
    if (rejected(req, res)) return;
    if (req.method !== 'POST') return sendMethodNotAllowed(res, 'POST');
    let body = null;
    try {
      const text = await readBoundedBody(req);
      body = text === null ? null : parseJsonBody(text);
    } catch {
      body = null;
    }
    const rawPath = typeof body?.path === 'string' ? body.path.trim() : '';
    if (!rawPath) {
      sendJson(res, 400, { code: 'bad-request', message: 'path is required' });
      return;
    }
    const expanded = rawPath === '~' ? homedir() : rawPath.startsWith('~/') ? join(homedir(), rawPath.slice(2)) : rawPath;
    if (!isAbsolute(expanded) || !(await dirExists(expanded))) {
      sendJson(res, 400, { code: 'bad-path', message: `directory does not exist: ${expanded}` });
      return;
    }
    const canon = await realpath(expanded).catch(() => expanded);
    try {
      let before = 0;
      let nextRoots = null;
      // Idempotent on the write chain: the running config may lag behind the
      // persisted override until HMR recomposes, so `added`/`removed` are
      // measured against the authoritative pre-change list.
      await updateExtraRoots((list) => {
        before = list.length;
        nextRoots =
          mode === 'add'
            ? list.includes(canon)
              ? list
              : [...list, canon]
            : list.filter((p) => p !== canon && p !== rawPath);
        return nextRoots;
      });
      sendJson(res, 200, {
        roots: nextRoots ?? [],
        added: mode === 'add' && nextRoots !== null && nextRoots.length !== before,
        removed: mode === 'remove' && nextRoots !== null && nextRoots.length !== before,
        path: canon,
      });
    } catch (error) {
      sendJson(res, 501, { code: 'persist-failed', message: String(error?.message ?? error) });
    }
  };

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/ganleme/roots',
        handler: async (req, res) => {
          if (rejected(req, res)) return;
          if (req.method !== 'GET') return sendMethodNotAllowed(res, 'GET');
          sendJson(res, 200, { roots: config.extraRoots ?? [] });
        },
      }),
    'ganleme: GET /ganleme/roots',
  );

  // Opens the host's native directory picker, scans the chosen folder and
  // persists the result as an extra root in one round trip.
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/ganleme/roots/pick',
        handler: async (req, res) => {
          if (rejected(req, res)) return;
          if (req.method !== 'POST') return sendMethodNotAllowed(res, 'POST');
          let picker;
          try {
            picker = ctx.directoryPickerController;
          } catch {
            picker = undefined;
          }
          if (!picker || typeof picker.pick !== 'function') {
            sendJson(res, 501, { code: 'picker-unavailable', message: 'directory picker is not available in this deployment' });
            return;
          }
          let picked;
          try {
            picked = await picker.pick();
          } catch (error) {
            sendJson(res, 502, { code: 'pick-failed', message: String(error?.message ?? error) });
            return;
          }
          if (!picked) {
            sendJson(res, 200, { roots: config.extraRoots ?? [], picked: false });
            return;
          }
          const canon = await realpath(picked).catch(() => picked);
          if (!isAbsolute(canon) || !(await dirExists(canon))) {
            sendJson(res, 400, { code: 'bad-path', message: `directory does not exist: ${canon}` });
            return;
          }
          const current = (config.extraRoots ?? []).map((p) => String(p));
          try {
            let before = 0;
            let nextRoots = null;
            // Idempotent on the write chain: the running config may lag behind
            // the persisted override until HMR recomposes.
            await updateExtraRoots((list) => {
              before = list.length;
              nextRoots = list.some((p) => p.replace(/[\\/]+$/, '') === canon) ? list : [...list, canon];
              return nextRoots;
            });
            sendJson(res, 200, {
              roots: nextRoots ?? current,
              picked: true,
              added: nextRoots !== null && nextRoots.length !== before,
              path: canon,
            });
          } catch (error) {
            sendJson(res, 501, { code: 'persist-failed', message: String(error?.message ?? error) });
          }
        },
      }),
    'ganleme: POST /ganleme/roots/pick',
  );

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/ganleme/roots/add',
        handler: (req, res) => handleRootsMutation(req, res, 'add'),
      }),
    'ganleme: POST /ganleme/roots/add',
  );

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: '/ganleme/roots/remove',
        handler: (req, res) => handleRootsMutation(req, res, 'remove'),
      }),
    'ganleme: POST /ganleme/roots/remove',
  );
}
