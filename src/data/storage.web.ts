import type { EntityKind, QueueItem } from '../domain/types';
import { isDemoRecord } from './demo-cleanup';
type Row = { kind: EntityKind; id: string; payload: unknown; version: number };
const key = (scope: string) => `cicura-demo-v1:${scope}`;
type History = { seq: number; kind: EntityKind; entity_id: string; payload: unknown; version: number; event: string; created_at: string };
type StoredData = { rows: Row[]; queue: QueueItem[]; history?: History[]; recoveryToken?: string };
type Recovery = { claims: Record<string, string>; staged: Record<string, { token: string; data: StoredData }> };
const recoveryKey = 'cicure-legacy-recovery-v1';
const recovery = (): Recovery => JSON.parse(localStorage.getItem(recoveryKey) ?? '{"claims":{},"staged":{}}');
const read = (scope: string): StoredData => {
  const data: StoredData = JSON.parse(localStorage.getItem(key(scope)) ?? '{"rows":[],"queue":[]}');
  const staged = recovery().staged[scope];
  // Claim and copied snapshot are committed together in one localStorage write.
  // The next regular mutation materializes that snapshot in the account key.
  return staged && data.recoveryToken !== staged.token ? staged.data : data;
};
export async function readRecords(scope: string) { return read(scope).rows; }
export async function removeDemoRecords(scope: string) {
  const data = read(scope);
  const removed = new Set(data.rows.filter(r => isDemoRecord(r.kind, r.id, r.payload)).map(r => `${r.kind}:${r.id}`));
  data.rows = data.rows.filter(r => !removed.has(`${r.kind}:${r.id}`));
  data.queue = data.queue.filter(r => !removed.has(`${r.kind}:${r.entityId}`) && !isDemoRecord(r.kind, r.entityId, r.payload));
  localStorage.setItem(key(scope), JSON.stringify(data));
}
export async function writeRecord(scope: string, kind: EntityKind, id: string, payload: unknown, enqueue: boolean, remoteVersion?: number) {
  const data = read(scope); const existing = data.rows.find(r => r.kind === kind && r.id === id); const pending = data.queue.find(r => r.id === `${kind}:${id}`);
  if (!enqueue && pending) return;
  const version = remoteVersion ?? (existing?.version ?? 0) + 1;
  if (enqueue) data.history = [...(data.history ?? []), { seq: (data.history?.length ?? 0) + 1, kind, entity_id: id, payload, version, event: 'save', created_at: new Date().toISOString() }];
  data.rows = [...data.rows.filter(r => !(r.kind === kind && r.id === id)), { kind, id, payload, version }];
  if (enqueue) data.queue = [...data.queue.filter(r => r.id !== `${kind}:${id}`), { id: `${kind}:${id}`, kind, entityId: id, payload, version, baseVersion: pending?.baseVersion ?? existing?.version ?? 0, attempts: 0 }];
  localStorage.setItem(key(scope), JSON.stringify(data));
}
export async function queue(scope: string) { return read(scope).queue; }
export async function acknowledge(scope: string, item: QueueItem) { const data = read(scope); data.queue = data.queue.filter(q => !(q.id === item.id && q.version === item.version)).map(q => q.id === item.id ? { ...q, baseVersion: Math.max(q.baseVersion, item.version) } : q); localStorage.setItem(key(scope), JSON.stringify(data)); }
export async function markError(scope: string, item: QueueItem, error: string) { const data = read(scope); data.queue = data.queue.map(q => q.id === item.id && q.version === item.version ? { ...q, attempts: q.attempts + 1, error } : q); localStorage.setItem(key(scope), JSON.stringify(data)); }
export async function readLocalHistory(scope: string) { return [...(read(scope).history ?? [])].reverse().slice(0, 300); }
export async function resolveQueuedRecord(scope: string, item: QueueItem, remote: { payload: unknown; version: number }, choice: 'local' | 'server') {
  const data = read(scope);
  if (data.queue.find(row => row.id === item.id)?.version !== item.version) throw new Error('O registro mudou enquanto você comparava. Abra o conflito novamente.');
  data.history ??= [];
  for (const [event, payload, version] of [['conflict-local', item.payload, item.version], ['conflict-server', remote.payload, remote.version]] as const) data.history.push({ seq: data.history.length + 1, kind: item.kind, entity_id: item.entityId, payload, version, event, created_at: new Date().toISOString() });
  const version = choice === 'local' ? Math.max(remote.version, item.version) + 1 : remote.version;
  data.rows = [...data.rows.filter(row => row.kind !== item.kind || row.id !== item.entityId), { kind: item.kind, id: item.entityId, version, payload: choice === 'local' ? item.payload : remote.payload }];
  data.queue = choice === 'server' ? data.queue.filter(row => row.id !== item.id) : data.queue.map(row => row.id === item.id ? { ...row, version, baseVersion: remote.version, attempts: 0, error: undefined } : row);
  localStorage.setItem(key(scope), JSON.stringify(data));
}

const legacyKinds = new Set<EntityKind>(['patients', 'wounds', 'visits', 'reports']);
const isLegacyScope = (scope: string) => scope === 'individual' || /^org_[a-zA-Z0-9-]+$/.test(scope);
export type LegacyRecordSummary = { total: number; patients: number; wounds: number; visits: number; reports: number; sources: number };
function legacyRows() {
  const claims = recovery().claims;
  const rows: (Row & { scope: string })[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const storedKey = localStorage.key(index);
    if (!storedKey?.startsWith('cicura-demo-v1:')) continue;
    const scope = storedKey.slice('cicura-demo-v1:'.length);
    if (!isLegacyScope(scope) || claims[scope]) continue;
    for (const row of read(scope).rows) if (legacyKinds.has(row.kind) && !isDemoRecord(row.kind, row.id, row.payload)) rows.push({ ...row, scope });
  }
  return rows;
}
export async function listLegacyRecords(): Promise<LegacyRecordSummary> {
  const rows = legacyRows();
  return { total: rows.length, patients: rows.filter(r => r.kind === 'patients').length, wounds: rows.filter(r => r.kind === 'wounds').length, visits: rows.filter(r => r.kind === 'visits').length, reports: rows.filter(r => r.kind === 'reports').length, sources: new Set(rows.map(r => r.scope)).size };
}
export async function claimLegacyRecords(targetScope: string): Promise<{ imported: number; skipped: number; sources: number }> {
  if (!/^user:[a-zA-Z0-9-]+$/.test(targetScope)) throw new Error('Entre em uma conta individual para recuperar os registros.');
  const eligible = legacyRows();
  const sources = [...new Set(eligible.map(row => row.scope))];
  if (!sources.length) return { imported: 0, skipped: 0, sources: 0 };
  const data: StoredData = JSON.parse(JSON.stringify(read(targetScope)));
  const result = { imported: 0, skipped: 0, sources: sources.length };
  const now = new Date().toISOString();
  for (const row of eligible) {
    if (data.rows.some(existing => existing.kind === row.kind && existing.id === row.id)) { result.skipped++; continue; }
    const version = Math.max(1, row.version);
    data.rows.push({ kind: row.kind, id: row.id, payload: row.payload, version });
    data.queue.push({ id: `${row.kind}:${row.id}`, kind: row.kind, entityId: row.id, payload: row.payload, version, baseVersion: 0, attempts: 0 });
    data.history ??= [];
    data.history.push({ seq: data.history.length + 1, kind: row.kind, entity_id: row.id, payload: row.payload, version, event: 'legacy-import', created_at: now });
    result.imported++;
  }
  const registry = recovery();
  for (const source of sources) registry.claims[source] = targetScope;
  const token = `${now}:${sources.join(',')}`;
  data.recoveryToken = token;
  registry.staged[targetScope] = { token, data };
  localStorage.setItem(recoveryKey, JSON.stringify(registry));
  return result;
}
