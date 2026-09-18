import * as SQLite from 'expo-sqlite';
import type { EntityKind, QueueItem } from '../domain/types';
let database: Promise<SQLite.SQLiteDatabase>;
export async function db() {
  if (!database) database = (async () => {
    const value = await SQLite.openDatabaseAsync('cicura.db');
    await value.execAsync(`PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS records (scope TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(scope,kind,id)); CREATE TABLE IF NOT EXISTS sync_queue (scope TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, entity_id TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL, base_version INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, error TEXT, PRIMARY KEY(scope,id));`);
    return value;
  })();
  return database;
}
export async function readRecords(scope: string) { return (await (await db()).getAllAsync<{ kind: EntityKind; payload: string }>('SELECT kind,payload FROM records WHERE scope=?', scope)).map(r => ({ kind: r.kind, payload: JSON.parse(r.payload) })); }
export async function writeRecord(scope: string, kind: EntityKind, id: string, payload: unknown, enqueue: boolean, remoteVersion?: number) {
  const database = await db();
  await database.withExclusiveTransactionAsync(async tx => {
    const existing = await tx.getFirstAsync<{ version: number }>('SELECT version FROM records WHERE scope=? AND kind=? AND id=?', scope, kind, id);
    const version = remoteVersion ?? (existing?.version ?? 0) + 1;
    const key = `${kind}:${id}`;
    const pending = await tx.getFirstAsync<{ base_version: number }>('SELECT base_version FROM sync_queue WHERE scope=? AND id=?', scope, key);
    if (!enqueue && pending) return;
    await tx.runAsync('INSERT OR REPLACE INTO records (scope,kind,id,payload,version) VALUES (?,?,?,?,?)', scope, kind, id, JSON.stringify(payload), version);
    if (enqueue) await tx.runAsync('INSERT OR REPLACE INTO sync_queue (scope,id,kind,entity_id,payload,version,base_version) VALUES (?,?,?,?,?,?,?)', scope, key, kind, id, JSON.stringify(payload), version, pending?.base_version ?? existing?.version ?? 0);
  });
}
export async function queue(scope: string): Promise<QueueItem[]> { const rows = await (await db()).getAllAsync<any>('SELECT * FROM sync_queue WHERE scope=? ORDER BY rowid', scope); return rows.map(r => ({ id: r.id, kind: r.kind, entityId: r.entity_id, payload: JSON.parse(r.payload), version: r.version, baseVersion: r.base_version, attempts: r.attempts, error: r.error })); }
export async function acknowledge(scope: string, item: QueueItem) { const database = await db(); await database.withExclusiveTransactionAsync(async tx => { await tx.runAsync('DELETE FROM sync_queue WHERE scope=? AND id=? AND version=?', scope, item.id, item.version); await tx.runAsync('UPDATE sync_queue SET base_version=? WHERE scope=? AND id=?', item.version, scope, item.id); }); }
export async function markError(scope: string, item: QueueItem, error: string) { await (await db()).runAsync('UPDATE sync_queue SET attempts=attempts+1,error=? WHERE scope=? AND id=?', error, scope, item.id); }
