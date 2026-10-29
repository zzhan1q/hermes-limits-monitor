import { host, useValue, useQuery, queryClient, atom, Button, usePluginI18n } from '@hermes/plugin-sdk';
import { useRef } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';

const ID = 'limits-monitor';
const PANE = `${ID}:pane`;
const always = atom(true);
const disconnected = atom('');
const text = value => typeof value === 'string' ? value : '';
const list = value => Array.isArray(value) ? value : [];
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const subtle = { color: 'var(--ui-text-tertiary)', fontSize: 11, lineHeight: 1.5 };
const block = { border: '1px solid var(--ui-stroke-secondary)', borderRadius: 8, padding: 10, marginTop: 10 };
const warning = 'var(--ui-warning, var(--ui-accent))';
const labels = { Session: 'Session limit', Weekly: 'Weekly limit', 'API key quota': 'API key quota', day: 'Day', week: 'Week', month: 'Month', top_tier: 'Top-tier models' };
const flatLocales = {
  en: {
    'pane.title': 'Limits', 'pane.heading': 'Account allowances', 'pane.description': 'Provider allowances, not chat context size. Auto-refresh runs every 2 minutes while this pane is visible.',
    'action.refresh': 'Refresh', 'action.loading': 'Loading…', 'connection.offline': 'Hermes is disconnected. Data may be stale.',
    'status.reading': 'Reading provider data…', 'status.waiting': 'Waiting for Hermes connection…',
    'error.refresh': 'Could not refresh data. Previous values are unverified.', 'error.routes': 'Profile routes unavailable; coverage may be incomplete.',
    'error.roster': 'Profile list unavailable; showing reachable routes.', 'error.provider': 'Part of the provider catalog is invalid.',
    'error.catalog': 'Could not read profile allowances.', 'empty.providers': 'No provider data is available.',
    'empty.quota': 'No allowance data. This does not imply a zero balance.', 'label.profileAccount': 'Profile account',
    'label.account': 'Account', 'label.unknown': 'Unknown', 'label.limit': 'Limit', 'label.planLimit': 'Plan limit',
    'label.weekly': 'Weekly limit', 'label.session': 'Session limit', 'label.apiKey': 'API key quota',
    'label.day': 'Day', 'label.week': 'Week', 'label.month': 'Month', 'label.topTier': 'Top-tier models',
    'state.ready': 'Available', 'state.limited': 'Limited', 'state.unavailable': 'Authorization unavailable',
    'state.unknown': 'Allowance unknown', 'state.notConnected': 'Provider is not connected',
    'state.stale': 'Previous data — refresh failed', 'state.observation': 'Profile observation',
    'state.modelScope': 'Applies only to this model family, not the whole account',
    'state.low': 'Low allowance', 'state.exhausted': 'Allowance exhausted', 'state.resetUnknown': 'Reset time unknown',
    'state.resetPassed': 'Reset time passed — refresh', 'state.resetIn': 'Resets in', 'state.unitDay': 'd', 'state.unitHour': 'h', 'state.unitMinute': 'm', 'state.locale': 'en-US',
    'state.providerPaused': 'Provider paused the plan', 'state.limit': 'Limit', 'state.readAt': 'Catalog read',
    'state.cached': 'Allowances come from Hermes cache; API does not report snapshot time.',
    'state.allowance': 'allowance remaining', 'state.readError': 'Profile data unavailable'
  },
  ru: {
    'pane.title': 'Лимиты', 'pane.heading': 'Лимиты аккаунтов', 'pane.description': 'Лимиты провайдеров, не размер контекста чата. Автообновление раз в 2 минуты, пока панель видима.',
    'action.refresh': 'Обновить', 'action.loading': 'Загрузка…', 'connection.offline': 'Нет соединения с Hermes. Данные могут быть устаревшими.',
    'status.reading': 'Читаем данные провайдеров…', 'status.waiting': 'Ожидание соединения с Hermes…',
    'error.refresh': 'Не удалось обновить данные. Предыдущие значения не подтверждены.', 'error.routes': 'Маршруты профилей недоступны; охват может быть неполным.',
    'error.roster': 'Список профилей недоступен; показаны доступные маршруты.', 'error.provider': 'Часть каталога провайдеров некорректна.',
    'error.catalog': 'Не удалось прочитать лимиты профиля.', 'empty.providers': 'Нет доступных данных провайдеров.',
    'empty.quota': 'Нет данных о лимите. Это не означает нулевой остаток.', 'label.profileAccount': 'Аккаунт профиля',
    'label.account': 'Аккаунт', 'label.unknown': 'Неизвестно', 'label.limit': 'Лимит', 'label.planLimit': 'Лимит плана',
    'label.weekly': 'Недельный лимит', 'label.session': 'Сеансовый лимит', 'label.apiKey': 'Квота API-ключа',
    'label.day': 'День', 'label.week': 'Неделя', 'label.month': 'Месяц', 'label.topTier': 'Старшие модели',
    'state.ready': 'Доступен', 'state.limited': 'Есть ограничение', 'state.unavailable': 'Авторизация недоступна',
    'state.unknown': 'Лимит неизвестен', 'state.notConnected': 'Провайдер не подключён',
    'state.stale': 'Предыдущие данные — обновление не удалось', 'state.observation': 'Наблюдение профиля',
    'state.modelScope': 'Только семейство моделей, не весь аккаунт',
    'state.low': 'Мало остатка', 'state.exhausted': 'Лимит исчерпан', 'state.resetUnknown': 'Время сброса неизвестно',
    'state.resetPassed': 'Время сброса прошло — обновите данные', 'state.resetIn': 'Сброс через', 'state.unitDay': 'д', 'state.unitHour': 'ч', 'state.unitMinute': 'м', 'state.locale': 'ru-RU',
    'state.providerPaused': 'План приостановлен провайдером', 'state.limit': 'Ограничение', 'state.readAt': 'Каталог прочитан',
    'state.cached': 'Лимиты — из кеша Hermes; API не сообщает время снимка.',
    'state.allowance': 'осталось', 'state.readError': 'Данные профиля недоступны'
  }
};

function nestMessages(flat) {
  const nested = {};
  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.');
    let branch = nested;
    for (const part of parts.slice(0, -1)) branch = branch[part] ||= {};
    branch[parts.at(-1)] = value;
  }
  return nested;
}
const locales = Object.fromEntries(Object.entries(flatLocales).map(([locale, messages]) => [locale, nestMessages(messages)]));

export function remaining(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? 100 - value : null;
}
export function resetInfo(value, now = Date.now(), t) {
  const date = typeof value === 'number' || typeof value === 'string' ? new Date(value) : null;
  const translate = typeof t === 'function' ? t : key => ({ unknown: 'Reset time unknown', passed: 'Reset time passed — refresh', in: 'Resets in', day: 'd', hour: 'h', minute: 'm' })[key];
  if (!date || !Number.isFinite(date.getTime())) return translate('unknown');
  const delta = date.getTime() - now;
  if (delta <= 0) return translate('passed');
  const minutes = Math.ceil(delta / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor(minutes % 1440 / 60);
  const mins = minutes % 60;
  return `${translate('in')} ${days ? `${days}${translate('day')} ` : ''}${hours ? `${hours}${translate('hour')} ` : ''}${mins}${translate('minute')} · ${date.toLocaleString(typeof t === 'function' ? t('locale') : 'en-US')}`;
}
function windowsOf(windows) {
  return list(windows).filter(record).map(w => ({ label: labels[w.label] || text(w.label) || 'Limit',
    left: remaining(w.used_percent), resets: w.resets_at || null,
    scope: w.scope === 'model' ? 'model' : 'account' }));
}
export function normalizeProvider(row) {
  const slug = text(row.slug) || text(row.name) || 'unknown';
  const pooled = Array.isArray(row.usage?.accounts);
  const accounts = [];
  const raw = pooled ? row.usage.accounts : [{ id: '', label: 'Profile account', windows: row.usage?.windows, state: '' }];
  for (const [i, account] of raw.filter(record).entries()) {
    const key = String(i);
    const windows = windowsOf(account.windows);
    if (!pooled && !windows.length) {
      for (const g of list(row.plan_usage?.gauges).filter(record)) {
        const fraction = g.left_fraction;
        windows.push({ label: labels[g.label] || text(g.title) || text(g.label) || 'Plan limit',
          left: typeof fraction === 'number' && Number.isFinite(fraction) && fraction >= 0 && fraction <= 1
            ? fraction * 100 : null,
          resets: g.resets_at_ms ?? null, scope: g.scope === 'top_tier' ? 'model' : 'account' });
      }
    }
    const normalized = { key, label: text(account.label) || `Account ${i + 1}`, windows,
      state: text(account.state), resets: account.resets_at || null };
    // Keep account rows separate by ordinal; omit provider account identifiers entirely.
    accounts.push(normalized);
  }
  return { slug, name: text(row.name) || slug, authenticated: row.authenticated,
    current: row.is_current === true, pooled, accounts,
    limit: row.limit ? { scope: row.limit.scope, resets: row.limit.resets_at,
      models: Object.entries(row.limit.models || {}).map(([name, resets]) => ({ name, resets })) } : null,
    paused: !!text(row.plan_usage?.paused_reason) };
}
export function groupAccounts(profiles) {
  const groups = new Map();
  for (const profile of profiles) for (const provider of profile.providers) {
    const key = JSON.stringify([profile.connection, provider.slug]);
    if (!groups.has(key)) groups.set(key, { key, name: provider.name, slug: provider.slug, accounts: [], sources: [] });
    const group = groups.get(key);
    group.sources.push({ profile: profile.name, stale: profile.stale, provider });
    for (const account of provider.accounts) {
      // Each row is an observation, never an independent budget to add up.
      // No cross-profile union without a server identity including endpoint.
      const accountKey = `${profile.key}:${provider.slug}:${account.key}`;
      group.accounts.push({ ...account, key: accountKey, profiles: [profile.name], stale: !!profile.stale,
        authenticated: provider.authenticated });
    }
  }
  return [...groups.values()].sort((a, b) => {
    const priority = g => g.sources.some(s => s.provider.current) ? 2 : g.accounts.some(a => a.windows.length) ? 1 : 0;
    return priority(b) - priority(a);
  });
}
async function mapLimited(items, fn, concurrency = 3) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor++; results[index] = await fn(items[index]); }
  }));
  return results;
}
function checkActive(control) {
  if (control.signal?.aborted || control.isVisible?.() === false) {
    const error = new Error('Limits read cancelled'); error.name = 'AbortError'; throw error;
  }
}
export async function loadSnapshot(api, homeProfile, connection = '', control = {}) {
  checkActive(control);
  const canRoute = typeof api.profileRoutes === 'function' && typeof api.requestProfile === 'function';
  const [rosterRead, routeRead] = await Promise.allSettled([
    api.request('profiles.list', { include_sessions: false }),
    canRoute ? api.profileRoutes() : Promise.resolve([]),
  ]);
  checkActive(control);
  const roster = rosterRead.status === 'fulfilled' ? list(rosterRead.value?.profiles).filter(record)
    .map(p => ({ name: text(p.name), display_name: text(p.display_name) })) : [];
  const rosterFailure = rosterRead.status === 'rejected';
  const routeFailure = routeRead.status === 'rejected';
  const routes = routeRead.status === 'fulfilled' ? list(routeRead.value).filter(r => record(r) &&
    text(r.connectionId) && text(r.profile) && text(r.targetProfile)) : [];
  const items = routes.length ? routes.map(route => ({
    name: text(route.targetProfile) || text(route.profile), connection: text(route.connectionId), route,
    metadata: route.connectionId === connection ? roster.find(p => p.name === route.targetProfile) || {} : {},
  })) : roster.map(p => ({ name: text(p.name), connection, metadata: p }));
  if (!items.some(i => i.name === homeProfile && i.connection === connection) && !routes.length)
    items.unshift({ name: homeProfile, connection, metadata: {} });
  const profiles = await mapLimited(items, async item => {
    const key = JSON.stringify([item.connection, item.name]);
    const result = { key, name: item.name, connection: item.connection, label: text(item.metadata.display_name) || item.name,
      providers: [], errors: [], readAt: Date.now(), stale: false, catalogFailed: false };
    const request = async (method, params = {}) => {
      checkActive(control);
      if (item.route) return api.requestProfile(item.route, method, params, 20000);
      if (item.name === homeProfile) return api.request(method, params, 20000);
      throw new Error('profile routing unavailable');
    };
    const catalog = await Promise.allSettled([
      request('model.options', { explicit_only: true, include_unconfigured: false }),
    ]).then(([value]) => value);
    if (catalog.status === 'fulfilled' && Array.isArray(catalog.value?.providers)) {
      for (const row of catalog.value.providers) {
        try {
          if (!record(row) || !text(row.slug)) throw new Error('Invalid provider');
          result.providers.push(normalizeProvider(row));
        } catch { result.errors.push('error.provider'); }
      }
    } else { result.catalogFailed = true; result.errors.push('error.catalog'); }
    return result;
  });
  checkActive(control);
  return { profiles, readAt: Date.now(), routeFailure, rosterFailure };
}
export function mergeSnapshots(next, previous) {
  if (!previous) return next;
  return { ...next, profiles: next.profiles.map(p => {
    if (!p.catalogFailed) return p;
    const old = previous.profiles.find(o => o.key === p.key);
    return old?.providers.length ? { ...p, providers: old.providers, readAt: old.readAt, stale: true } : p;
  }) };
}
export function pollInterval(visible, attempts) { return !visible ? false : attempts < 3 ? 5000 : 120000; }
export async function readCycle(api, profile, connection, cache, control = {}) {
  try {
    const next = mergeSnapshots(await loadSnapshot(api, profile, connection, control), cache.previous);
    cache.previous = next;
    return next;
  } finally { cache.attempts++; }
}
const formatLeft = (value, locale) => value > 0 && value < 0.1
  ? (locale === 'ru-RU' ? '<0,1%' : '<0.1%') : `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
const windowKeys = { 'Session limit': 'label.session', 'Weekly limit': 'label.weekly', 'API key quota': 'label.apiKey', Day: 'label.day', Week: 'label.week', Month: 'label.month', 'Top-tier models': 'label.topTier', 'Plan limit': 'label.planLimit', Limit: 'label.limit' };
const resetTranslator = t => key => key === 'locale' ? t('state.locale') : t(({ unknown: 'state.resetUnknown', passed: 'state.resetPassed', in: 'state.resetIn', day: 'state.unitDay', hour: 'state.unitHour', minute: 'state.unitMinute' })[key]);
function WindowGauge({ window: w, stale, t }) {
  const low = w.left !== null && w.left <= 20;
  const label = t(windowKeys[w.label] || w.label);
  const locale = t('state.locale');
  return jsxs('div', { style: { marginTop: 10 }, children: [
    jsxs('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 6 }, children: [
      jsx('span', { style: { fontSize: 11 }, children: label }),
      jsx('strong', { style: { whiteSpace: 'nowrap', color: low ? warning : 'var(--ui-text-primary)' }, children:
        w.left === null ? t('label.unknown') : `${formatLeft(w.left, locale)} ${t('state.allowance')}` }),
    ] }),
    w.left !== null && jsx('div', { role: 'progressbar', 'aria-label': `${t('state.allowance')}: ${label}`,
      'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': w.left,
      style: { height: 5, borderRadius: 3, background: 'var(--ui-stroke-secondary)', marginTop: 6, overflow: 'hidden' },
      children: jsx('div', { style: { width: `${w.left}%`, height: '100%', background: low ? warning : 'var(--ui-accent)', opacity: stale ? 0.45 : 1 } }) }),
    jsx('div', { style: subtle, children: resetInfo(w.resets, Date.now(), resetTranslator(t)) }),
    w.scope === 'model' && jsx('div', { style: subtle, children: t('state.modelScope') }),
    low && jsx('div', { style: { ...subtle, color: warning }, children: w.left === 0 ? t('state.exhausted') : t('state.low') }),
  ] });
}
function AccountCard({ account, t }) {
  const stateKey = { ready: 'state.ready', limited: 'state.limited', unavailable: 'state.unavailable', unknown: 'state.unknown' }[account.state];
  const numbered = /^Account (\d+)$/.exec(account.label);
  const label = numbered ? `${t('label.account')} ${numbered[1]}` : account.label === 'Profile account' ? t('label.profileAccount') : account.label;
  return jsxs('div', { style: { marginTop: 9, paddingTop: 8, borderTop: '1px solid var(--ui-stroke-secondary)' }, children: [
    jsx('div', { style: { fontWeight: 600, overflowWrap: 'anywhere' }, children: label }),
    jsx('div', { style: subtle, children: `${t('state.observation')}: ${account.profiles.join(', ')}` }),
    stateKey && jsx('div', { style: subtle, children: t(stateKey) }),
    account.stale && jsx('div', { role: 'status', style: { ...subtle, color: warning }, children: t('state.stale') }),
    account.authenticated === false && jsx('div', { style: subtle, children: t('state.notConnected') }),
    account.windows.length ? account.windows.map((w, i) => jsx(WindowGauge, { window: w, stale: account.stale, t }, i))
      : jsx('div', { style: subtle, children: t('empty.quota') }),
    account.state === 'limited' && account.resets && jsx('div', { style: subtle, children: resetInfo(account.resets, Date.now(), resetTranslator(t)) }),
  ] });
}
function ProviderCard({ group, t }) {
  return jsxs('details', { open: group.sources.some(s => s.provider.current) || group.accounts.some(a => a.windows.length), style: block, children: [
    jsx('summary', { style: { cursor: 'pointer', fontWeight: 600, overflowWrap: 'anywhere' }, children: group.name }),
    jsx('div', { style: subtle, children: group.slug }),
    group.accounts.map(account => jsx(AccountCard, { account, t }, account.key)),
    group.sources.filter(s => s.provider.limit || s.provider.paused).map((s, i) => jsxs('div', { style: subtle, children: [
      jsx('div', { children: s.provider.paused ? t('state.providerPaused') : `${t('state.limit')}: ${s.profile}` }),
      s.provider.limit?.scope === 'account' && jsx('div', { children: resetInfo(s.provider.limit.resets, Date.now(), resetTranslator(t)) }),
      list(s.provider.limit?.models).map(m => jsx('div', { children: `${m.name}: ${resetInfo(m.resets, Date.now(), resetTranslator(t))}` }, m.name)),
    ] }, i)),
  ] });
}
function LimitsPane() {
  const t = usePluginI18n(ID);
  const visibility = typeof host.paneVisibility === 'function' ? host.paneVisibility(PANE) : always;
  const visible = useValue(visibility);
  const profile = useValue(host.state.profile);
  const connection = useValue(host.state.connectionId || disconnected) || '';
  const gateway = useValue(host.state.gateway);
  const key = `${connection}:${profile}`;
  const queryKey = [ID, connection, profile];
  const memory = useRef({ key, attempts: 0, previous: queryClient.getQueryData(queryKey) || null });
  if (memory.current.key !== key) memory.current = { key, attempts: 0, previous: queryClient.getQueryData(queryKey) || null };
  const cache = memory.current;
  const query = useQuery({ queryKey, enabled: visible && gateway === 'open',
    queryFn: ({ signal }) => readCycle(host, profile, connection, cache, {
      signal, isVisible: () => visibility.get() && host.state.gateway.get() === 'open',
    }), retry: (count, error) => error?.name !== 'AbortError' && count < 1,
    staleTime: 0, refetchOnWindowFocus: false, refetchIntervalInBackground: false,
    refetchInterval: () => pollInterval(visible, cache.attempts),
  });
  const data = query.data;
  return jsxs('div', { 'data-limits-monitor': 'pane', tabIndex: 0, 'aria-label': t('pane.heading'), style: { height: '100%', overflowY: 'auto', padding: 12,
    boxSizing: 'border-box', fontSize: 12, color: 'var(--ui-text-primary)' }, children: [
    jsxs('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, children: [
      jsx('strong', { children: t('pane.heading') }),
      jsx(Button, { type: 'button', variant: 'outline', size: 'sm', disabled: query.isFetching || gateway !== 'open',
        onClick: () => { memory.current.attempts = 0; void query.refetch(); }, children: query.isFetching ? t('action.loading') : t('action.refresh') }),
    ] }),
    jsx('p', { style: subtle, children: t('pane.description') }),
    gateway !== 'open' && jsx('div', { role: 'status', style: subtle, children: t('connection.offline') }),
    query.isError && jsx('div', { role: 'alert', style: { ...subtle, color: warning }, children: t('error.refresh') }),
    !data && query.isPending && jsx('div', { role: 'status', style: subtle, children: gateway === 'open' ? t('status.reading') : t('status.waiting') }),
    data && jsx('div', { style: subtle, children: `${t('state.readAt')}: ${new Date(data.readAt).toLocaleTimeString(t('state.locale'))}. ${t('state.cached')}` }),
    data?.routeFailure && jsx('div', { style: { ...subtle, color: warning }, children: t('error.routes') }),
    data?.rosterFailure && jsx('div', { style: { ...subtle, color: warning }, children: t('error.roster') }),
    data && groupAccounts(data.profiles).map(group => jsx(ProviderCard, { group, t }, group.key)),
    data && !data.profiles.some(p => p.providers.length) && jsx('p', { style: subtle, children: t('empty.providers') }),
    data?.profiles.filter(p => p.errors.length).map(p => jsx('div', { role: 'status', style: { ...block, ...subtle },
      children: `${p.label}: ${[...new Set(p.errors)].map(error => t(error)).join('; ')}` }, p.key)),
  ] });
}
export default { id: ID, name: 'Limits', defaultEnabled: true, register(ctx) {
  ctx.i18n.register(locales);
  ctx.register({ id: 'pane', area: 'panes', title: 'Limits', order: 1000,
    data: { placement: 'left', width: '300px', collapsible: true, hideOnly: true,
      dock: { pane: 'terminal', pos: 'center' } }, render: () => jsx(LimitsPane, {}) });
} };
