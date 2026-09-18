import type { EntityKind, QueueItem } from '../domain/types';
type Row = { kind: EntityKind; id: string; payload: unknown; version: number };
const key = (scope: string) => `cicura-demo-v1:${scope}`;
const read = (scope: string): { rows: Row[]; queue: QueueItem[] } => JSON.parse(localStorage.getItem(key(scope)) ?? '{"rows":[],"queue":[]}');
export async function readRecords(scope: string) { return read(scope).rows; }
export async function writeRecord(scope: string, kind: EntityKind, id: string, payload: unknown, enqueue: boolean, remoteVersion?: number) {
  const data = read(scope); const existing = data.rows.find(r => r.kind === kind && r.id === id); const pending = data.queue.find(r => r.id === `${kind}:${id}`);
  if (!enqueue && pending) return;
  const version = remoteVersion ?? (existing?.version ?? 0) + 1;
  data.rows = [...data.rows.filter(r => !(r.kind === kind && r.id === id)), { kind, id, payload, version }];
  if (enqueue) data.queue = [...data.queue.filter(r => r.id !== `${kind}:${id}`), { id: `${kind}:${id}`, kind, entityId: id, payload, version, baseVersion: pending?.baseVersion ?? existing?.version ?? 0, attempts: 0 }];
  localStorage.setItem(key(scope), JSON.stringify(data));
}
export async function queue(scope: string) { return read(scope).queue; }
export async function acknowledge(scope: string, item: QueueItem) { const data = read(scope); data.queue = data.queue.filter(q => !(q.id === item.id && q.version === item.version)).map(q => q.id === item.id ? { ...q, baseVersion: item.version } : q); localStorage.setItem(key(scope), JSON.stringify(data)); }
export async function markError(scope: string, item: QueueItem, error: string) { const data = read(scope); data.queue = data.queue.map(q => q.id === item.id ? { ...q, attempts: q.attempts + 1, error } : q); localStorage.setItem(key(scope), JSON.stringify(data)); }
