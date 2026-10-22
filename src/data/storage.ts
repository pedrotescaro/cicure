import * as SQLite from 'expo-sqlite';
import type { EntityKind, QueueItem } from '../domain/types';
import { isDemoRecord } from './demo-cleanup';
let database: Promise<SQLite.SQLiteDatabase>;
export async function db() {
  if (!database) database = (async () => {
    const value = await SQLite.openDatabaseAsync('cicura.db');
    await value.execAsync(`PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS records (scope TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(scope,kind,id)); CREATE TABLE IF NOT EXISTS sync_queue (scope TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, entity_id TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL, base_version INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, error TEXT, PRIMARY KEY(scope,id)); CREATE TABLE IF NOT EXISTS local_history (seq INTEGER PRIMARY KEY AUTOINCREMENT, scope TEXT NOT NULL, kind TEXT NOT NULL, entity_id TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL, event TEXT NOT NULL, created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS legacy_claims (legacy_scope TEXT PRIMARY KEY, target_scope TEXT NOT NULL, claimed_at TEXT NOT NULL);`);
    return value;
  })();
  return database;
}
export async function readRecords(scope: string) { return (await (await db()).getAllAsync<{ kind: EntityKind; payload: string }>('SELECT kind,payload FROM records WHERE scope=?', scope)).map(r => ({ kind: r.kind, payload: JSON.parse(r.payload) })); }
export async function removeDemoRecords(scope: string) {
  await (await db()).withExclusiveTransactionAsync(async tx => {
    const rows = await tx.getAllAsync<{ kind: EntityKind; id: string; payload: string }>('SELECT kind,id,payload FROM records WHERE scope=?', scope);
    for (const row of rows) {
      if (isDemoRecord(row.kind, row.id, JSON.parse(row.payload))) {
        await tx.runAsync('DELETE FROM records WHERE scope=? AND kind=? AND id=?', scope, row.kind, row.id);
        await tx.runAsync('DELETE FROM sync_queue WHERE scope=? AND kind=? AND entity_id=?', scope, row.kind, row.id);
      }
    }
    const queued = await tx.getAllAsync<{ kind: EntityKind; id: string; entity_id: string; payload: string }>('SELECT kind,id,entity_id,payload FROM sync_queue WHERE scope=?', scope);
    for (const row of queued) {
      if (isDemoRecord(row.kind, row.entity_id, JSON.parse(row.payload))) await tx.runAsync('DELETE FROM sync_queue WHERE scope=? AND id=?', scope, row.id);
    }
  });
}
export async function writeRecord(scope: string, kind: EntityKind, id: string, payload: unknown, enqueue: boolean, remoteVersion?: number) {
  const database = await db();
  await database.withExclusiveTransactionAsync(async tx => {
    const existing = await tx.getFirstAsync<{ version: number }>('SELECT version FROM records WHERE scope=? AND kind=? AND id=?', scope, kind, id);
    const version = remoteVersion ?? (existing?.version ?? 0) + 1;
    const key = `${kind}:${id}`;
    const pending = await tx.getFirstAsync<{ base_version: number }>('SELECT base_version FROM sync_queue WHERE scope=? AND id=?', scope, key);
    if (!enqueue && pending) return;
    if (enqueue) await tx.runAsync('INSERT INTO local_history (scope,kind,entity_id,payload,version,event,created_at) VALUES (?,?,?,?,?,?,?)', scope, kind, id, JSON.stringify(payload), version, 'save', new Date().toISOString());
    await tx.runAsync('INSERT OR REPLACE INTO records (scope,kind,id,payload,version) VALUES (?,?,?,?,?)', scope, kind, id, JSON.stringify(payload), version);
    if (enqueue) await tx.runAsync('INSERT OR REPLACE INTO sync_queue (scope,id,kind,entity_id,payload,version,base_version) VALUES (?,?,?,?,?,?,?)', scope, key, kind, id, JSON.stringify(payload), version, pending?.base_version ?? existing?.version ?? 0);
  });
}
export async function queue(scope: string): Promise<QueueItem[]> { const rows = await (await db()).getAllAsync<any>('SELECT * FROM sync_queue WHERE scope=? ORDER BY rowid', scope); return rows.map(r => ({ id: r.id, kind: r.kind, entityId: r.entity_id, payload: JSON.parse(r.payload), version: r.version, baseVersion: r.base_version, attempts: r.attempts, error: r.error })); }
export async function acknowledge(scope: string, item: QueueItem) { const database = await db(); await database.withExclusiveTransactionAsync(async tx => { await tx.runAsync('DELETE FROM sync_queue WHERE scope=? AND id=? AND version=?', scope, item.id, item.version); await tx.runAsync('UPDATE sync_queue SET base_version=MAX(base_version,?) WHERE scope=? AND id=?', item.version, scope, item.id); }); }
export async function markError(scope: string, item: QueueItem, error: string) { await (await db()).runAsync('UPDATE sync_queue SET attempts=attempts+1,error=? WHERE scope=? AND id=? AND version=?', error, scope, item.id, item.version); }

export async function readLocalHistory(scope: string) {
  return (await (await db()).getAllAsync<{ seq: number; kind: EntityKind; entity_id: string; payload: string; version: number; event: string; created_at: string }>('SELECT * FROM local_history WHERE scope=? ORDER BY seq DESC LIMIT 300', scope)).map(row => ({ ...row, payload: JSON.parse(row.payload) }));
}
export async function resolveQueuedRecord(scope: string, item: QueueItem, remote: { payload: unknown; version: number }, choice: 'local' | 'server') {
  await (await db()).withExclusiveTransactionAsync(async tx => {
    const current = await tx.getFirstAsync<{ version: number }>('SELECT version FROM sync_queue WHERE scope=? AND id=?', scope, item.id);
    if (current?.version !== item.version) throw new Error('O registro mudou enquanto você comparava. Abra o conflito novamente.');
    for (const [event, payload, version] of [['conflict-local', item.payload, item.version], ['conflict-server', remote.payload, remote.version]] as const) await tx.runAsync('INSERT INTO local_history (scope,kind,entity_id,payload,version,event,created_at) VALUES (?,?,?,?,?,?,?)', scope, item.kind, item.entityId, JSON.stringify(payload), version, event, new Date().toISOString());
    const version = choice === 'local' ? Math.max(remote.version, item.version) + 1 : remote.version;
    const payload = choice === 'local' ? item.payload : remote.payload;
    await tx.runAsync('INSERT OR REPLACE INTO records (scope,kind,id,payload,version) VALUES (?,?,?,?,?)', scope, item.kind, item.entityId, JSON.stringify(payload), version);
    if (choice === 'server') await tx.runAsync('DELETE FROM sync_queue WHERE scope=? AND id=? AND version=?', scope, item.id, item.version);
    else await tx.runAsync('UPDATE sync_queue SET version=?,base_version=?,attempts=0,error=NULL WHERE scope=? AND id=?', version, remote.version, scope, item.id);
  });
}

const legacyKinds = new Set<EntityKind>(['patients', 'wounds', 'visits', 'reports']);
const isLegacyScope = (scope: string) => scope === 'individual' || /^org_[a-zA-Z0-9-]+$/.test(scope);
export type LegacyRecordSummary = { total: number; patients: number; wounds: number; visits: number; reports: number; sources: number };
function legacySummary(rows: { scope: string; kind: EntityKind }[]): LegacyRecordSummary {
  return { total: rows.length, patients: rows.filter(r => r.kind === 'patients').length, wounds: rows.filter(r => r.kind === 'wounds').length, visits: rows.filter(r => r.kind === 'visits').length, reports: rows.filter(r => r.kind === 'reports').length, sources: new Set(rows.map(r => r.scope)).size };
}
/** Returns counts only. Records belonging to account scopes are never examined. */
export async function listLegacyRecords(): Promise<LegacyRecordSummary> {
  const rows = await (await db()).getAllAsync<{ scope: string; kind: EntityKind; id: string; payload: string }>("SELECT r.scope,r.kind,r.id,r.payload FROM records r LEFT JOIN legacy_claims c ON c.legacy_scope=r.scope WHERE (r.scope='individual' OR r.scope GLOB 'org_*') AND c.legacy_scope IS NULL");
  return legacySummary(rows.filter(row => isLegacyScope(row.scope) && legacyKinds.has(row.kind) && !isDemoRecord(row.kind, row.id, JSON.parse(row.payload))));
}
/** Explicit, one-account claim. Originals and their original queue remain intact. */
export async function claimLegacyRecords(targetScope: string): Promise<{ imported: number; skipped: number; sources: number }> {
  if (!/^user:[a-zA-Z0-9-]+$/.test(targetScope)) throw new Error('Entre em uma conta individual para recuperar os registros.');
  const result = { imported: 0, skipped: 0, sources: 0 };
  await (await db()).withExclusiveTransactionAsync(async tx => {
    const rows = await tx.getAllAsync<{ scope: string; kind: EntityKind; id: string; payload: string; version: number }>("SELECT r.scope,r.kind,r.id,r.payload,r.version FROM records r LEFT JOIN legacy_claims c ON c.legacy_scope=r.scope WHERE (r.scope='individual' OR r.scope GLOB 'org_*') AND c.legacy_scope IS NULL ORDER BY r.scope,r.rowid");
    const eligible = rows.filter(row => isLegacyScope(row.scope) && legacyKinds.has(row.kind) && !isDemoRecord(row.kind, row.id, JSON.parse(row.payload)));
    const sources = [...new Set(eligible.map(row => row.scope))];
    const now = new Date().toISOString();
    for (const source of sources) await tx.runAsync('INSERT INTO legacy_claims (legacy_scope,target_scope,claimed_at) VALUES (?,?,?)', source, targetScope, now);
    for (const row of eligible) {
      const exists = await tx.getFirstAsync<{ id: string }>('SELECT id FROM records WHERE scope=? AND kind=? AND id=?', targetScope, row.kind, row.id);
      if (exists) { result.skipped++; continue; }
      const version = Math.max(1, row.version);
      await tx.runAsync('INSERT INTO records (scope,kind,id,payload,version) VALUES (?,?,?,?,?)', targetScope, row.kind, row.id, row.payload, version);
      await tx.runAsync('INSERT INTO sync_queue (scope,id,kind,entity_id,payload,version,base_version,attempts) VALUES (?,?,?,?,?,?,0,0)', targetScope, `${row.kind}:${row.id}`, row.kind, row.id, row.payload, version);
      await tx.runAsync('INSERT INTO local_history (scope,kind,entity_id,payload,version,event,created_at) VALUES (?,?,?,?,?,?,?)', targetScope, row.kind, row.id, row.payload, version, 'legacy-import', now);
      result.imported++;
    }
    result.sources = sources.length;
  });
  return result;
}
