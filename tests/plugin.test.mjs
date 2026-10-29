import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { QueryClient, QueryObserver } from '@tanstack/query-core';

const file = new URL('../desktop/plugin.js', import.meta.url);
const source = await fs.readFile(file, 'utf8');
const testSource = source.replace(/^import .*;\r?\n/gm, '') + '\n';
const stubs = `const host = {}; const useValue = x => x.get(); const useQuery = x => x; const queryClient = {getQueryData: () => null}; const atom = value => ({get: () => value}); const Button = 'button'; const useRef = current => ({current}); const usePluginI18n = () => key => key; const jsx = (type, props, key) => ({type, props, key}); const jsxs = jsx;\n`;
const mod = await import('data:text/javascript;base64,' + Buffer.from(stubs + testSource).toString('base64'));
const window = used_percent => ({ label: 'Weekly', used_percent, scope: 'account' });
const provider = (accounts, slug = 'openai-codex') => mod.normalizeProvider({ slug, usage: { accounts } }, 'owner');
const profile = (name, providers, more = {}) => ({ name, key: name, connection: 'local', providers, ...more });

test('remaining accepts finite percentages only and preserves exact bounds', () => {
  assert.equal(mod.remaining(0), 100); assert.equal(mod.remaining(100), 0);
  assert.equal(mod.remaining(28.4), 71.6);
  for (const value of [undefined, null, '0', NaN, Infinity, -1, 101]) assert.equal(mod.remaining(value), null);
});
test('reset labels distinguish unknown, expired, and future values', () => {
  assert.match(mod.resetInfo(null, 0), /unknown|неизвестно/i);
  assert.match(mod.resetInfo('bad', 0), /unknown|неизвестно/i);
  assert.match(mod.resetInfo(0, 0), /passed|expired|прошло/i);
  assert.match(mod.resetInfo(3600000, 0), /1h 0m|1ч 0м/);
});
test('pooled account rows preserve identities and never merge endpoint observations', () => {
  const p = provider([{ id: 'synthetic-a', state: 'ready', windows: [window(20)] }, { id: 'synthetic-b', windows: [] }, { id: 'synthetic-a', state: 'limited', windows: [window(100)] }]);
  assert.equal(p.accounts.length, 3); assert.equal(p.accounts[0].windows[0].left, 80);
  assert.equal(p.accounts[2].windows[0].left, 0); assert.notEqual(p.accounts[0].key, p.accounts[2].key);
  assert.ok(p.accounts.every(account => !('id' in account)));
});
test('unknown quota stays unknown and model windows retain their scope', () => {
  const p = mod.normalizeProvider({ slug: 'synthetic-provider', usage: { windows: [{ ...window(null), scope: 'model' }] } }, 'profile');
  assert.equal(p.accounts[0].windows[0].left, null); assert.equal(p.accounts[0].windows[0].scope, 'model');
  assert.equal(mod.normalizeProvider({ slug: 'synthetic-empty' }, 'profile').accounts[0].windows.length, 0);
});
test('plan gauges preserve fractions and model scope', () => {
  const p = mod.normalizeProvider({ slug: 'synthetic-plan', plan_usage: { gauges: [{ label: 'week', left_fraction: 0.42, scope: 'top_tier', resets_at_ms: 1000 }] } }, 'profile');
  assert.deepEqual(p.accounts[0].windows, [{ label: 'Week', left: 42, resets: 1000, scope: 'model' }]);
});
test('observations remain separate across profiles and connections', () => {
  const p = provider([{ id: 'synthetic-id', windows: [window(40)] }]);
  assert.equal(mod.groupAccounts([profile('synthetic-profile-a', [p]), profile('synthetic-profile-b', [p])])[0].accounts.length, 2);
  assert.equal(mod.groupAccounts([profile('same', [p]), profile('same', [p], { connection: 'remote' })]).length, 2);
});
test('catalog failure keeps only visibly stale previous values', () => {
  const previous = { profiles: [profile('profile', [provider([])])] };
  const retained = mod.mergeSnapshots({ profiles: [profile('profile', [], { catalogFailed: true })] }, previous);
  assert.equal(retained.profiles[0].stale, true); assert.equal(retained.profiles[0].providers.length, 1);
  assert.equal(mod.mergeSnapshots({ profiles: [profile('profile', [])] }, previous).profiles[0].providers.length, 0);
});
test('poll interval stops while hidden and bounds bootstrap attempts', () => {
  assert.equal(mod.pollInterval(false, 0), false); assert.equal(mod.pollInterval(true, 0), 5000);
  assert.equal(mod.pollInterval(true, 3), 120000);
});
test('pane registers a «Лимиты» tab enabled by default with English and Russian locales', () => {
  let contribution; let locales;
  mod.default.register({ register: value => { contribution = value; }, i18n: { register: value => { locales = value; } } });
  assert.equal(contribution.title, 'Limits'); assert.equal(contribution.area, 'panes');
  assert.equal(mod.default.id, 'limits-monitor'); assert.equal(mod.default.defaultEnabled, true);
  assert.equal(locales.en?.state?.locale, 'en-US'); assert.equal(locales.ru?.state?.locale, 'ru-RU');
  assert.equal(locales.ru?.pane?.heading, 'Лимиты аккаунтов');
});
test('snapshot accesses only profile roster and model catalog, never sessions or chat data', async () => {
  const calls = []; let rosterParams;
  const api = {
    request: async (method, params) => { calls.push(method); if (method === 'profiles.list') rosterParams = params; return { profiles: [{ name: 'default' }, { name: 'synthetic-bot' }] }; },
    profileRoutes: async () => ['default', 'synthetic-bot'].map(name => ({ connectionId: 'local', profile: name, targetProfile: name })),
    requestProfile: async (route, method) => {
      calls.push(method);
      if (route.profile === 'synthetic-bot') throw new Error('offline');
      assert.equal(method, 'model.options');
      return { providers: [{ slug: 'openai-codex', usage: { windows: [window(10)] } }] };
    },
  };
  const result = await mod.loadSnapshot(api, 'default', 'local');
  assert.equal(result.profiles.length, 2);
  assert.equal(result.profiles[0].providers[0].accounts[0].windows[0].left, 90);
  assert.equal(result.profiles[1].errors.length, 1);
  assert.deepEqual([...new Set(calls)].sort(), ['model.options', 'profiles.list']);
  assert.deepEqual(rosterParams, { include_sessions: false });
  assert.ok(!source.includes('session.active_list')); assert.ok(!source.includes('subagent.list'));
  assert.ok(result.profiles.every(p => !('sessions' in p) && !('children' in p)));
});
test('without routing, home catalog is never attributed to another profile', async () => {
  const calls = []; let catalogs = 0;
  const result = await mod.loadSnapshot({ request: async method => {
    calls.push(method);
    if (method === 'profiles.list') return { profiles: [{ name: 'default' }, { name: 'synthetic-bot' }] };
    if (method === 'model.options') { catalogs++; return { providers: [] }; }
    throw new Error('unexpected RPC');
  } }, 'default');
  assert.equal(catalogs, 1); assert.ok(result.profiles.find(p => p.name === 'synthetic-bot').errors.length);
  assert.ok(calls.every(method => ['profiles.list', 'model.options'].includes(method)));
});
test('malformed provider rows do not hide valid provider data', async () => {
  const result = await mod.loadSnapshot({
    request: async () => ({ profiles: [] }),
    profileRoutes: async () => [{ connectionId: 'local', profile: 'good', targetProfile: 'good' }],
    requestProfile: async () => ({ providers: [null, { slug: 'valid', usage: { windows: [null, window(12)] } }] }),
  }, 'default', 'local');
  assert.equal(result.profiles[0].errors.length, 1);
  assert.equal(result.profiles[0].providers[0].accounts[0].windows[0].left, 88);
});
test('aborted query launches no RPC', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  await assert.rejects(mod.loadSnapshot({ request: async () => { calls++; } }, 'default', '', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 0);
});
test('disabling the real QueryObserver stops pending provider fan-out and preserves prior cache', async () => {
  const client = new QueryClient(); let unsubscribe; let release; let started;
  const pending = new Promise(resolve => { release = resolve; });
  const firstRequest = new Promise(resolve => { started = resolve; });
  let visible = true; const calls = []; const previous = { profiles: [] };
  const cache = { attempts: 0, previous };
  const api = { request: async method => {
    calls.push(method);
    if (method === 'profiles.list') return { profiles: [{ name: 'default' }] };
    if (method === 'model.options') { started(); await pending; return { providers: [] }; }
    throw new Error('unexpected RPC');
  } };
  const options = { queryKey: ['limits-lifecycle'], enabled: true, retry: false, gcTime: 0,
    queryFn: ({ signal }) => mod.readCycle(api, 'default', '', cache, { signal, isVisible: () => visible }) };
  const observer = new QueryObserver(client, options);
  unsubscribe = observer.subscribe(() => {});
  try {
    await firstRequest; visible = false; observer.setOptions({ ...options, enabled: false }); release();
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.deepEqual([...new Set(calls)].sort(), ['model.options', 'profiles.list']);
    assert.equal(cache.previous, previous); assert.equal(cache.attempts, 1);
    assert.equal(observer.getCurrentResult().fetchStatus, 'idle');
  } finally { unsubscribe?.(); client.clear(); }
});
test('repeated failed reads exhaust the short bootstrap budget', async () => {
  const cache = { attempts: 0, previous: null };
  const api = { request: async () => { throw new Error('offline'); } };
  for (let i = 0; i < 5; i++) await mod.readCycle(api, 'default', 'local', cache);
  assert.equal(cache.attempts, 5); assert.equal(mod.pollInterval(true, cache.attempts), 120000);
  assert.equal(cache.previous.profiles[0].catalogFailed, true);
});
test('source avoids credential files, private provider endpoints, raw logging, and persistence', () => {
  for (const forbidden of ['auth.json', 'api_key', '/backend-api/', 'localStorage', 'ctx.storage', 'console.log']) assert.ok(!source.includes(forbidden), forbidden);
});
test('tiny positive remaining quota is not rounded to exhausted', () => {
  assert.ok(mod.remaining(99.99) > 0); assert.ok(mod.remaining(99.99) < 0.1);
});
