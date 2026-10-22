const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const { createHash } = require('node:crypto');

function harness(platform) {
  const database = new DatabaseSync(':memory:');
  // This is the v1.0.1 layout, before local_history and legacy_claims existed.
  database.exec('CREATE TABLE records (scope TEXT NOT NULL,kind TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(scope,kind,id)); CREATE TABLE sync_queue (scope TEXT NOT NULL,id TEXT NOT NULL,kind TEXT NOT NULL,entity_id TEXT NOT NULL,payload TEXT NOT NULL,version INTEGER NOT NULL,base_version INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,error TEXT,PRIMARY KEY(scope,id));');
  const values = new Map();
  const localStorage = { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const sql = { execAsync: async statement => database.exec(statement), getAllAsync: async (q, ...args) => database.prepare(q).all(...args), getFirstAsync: async (q, ...args) => database.prepare(q).get(...args), runAsync: async (q, ...args) => database.prepare(q).run(...args), withExclusiveTransactionAsync: async fn => { database.exec('BEGIN'); try { await fn(sql); database.exec('COMMIT'); } catch (e) { database.exec('ROLLBACK'); throw e; } } };
  const cache = new Map();
  function load(file) {
    const full = path.resolve(file); if (cache.has(full)) return cache.get(full).exports;
    const module = { exports: {} }; cache.set(full, module);
    const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { localStorage, Date, Set, Map, Math })(name => name === 'expo-sqlite' ? { openDatabaseAsync: async () => sql } : load(path.resolve(path.dirname(full), name) + '.ts'), module, module.exports);
    return module.exports;
  }
  const storage = load(`src/data/storage${platform === 'web' ? '.web' : ''}.ts`);
  function seed(scope, kind, id, payload, version = 4) {
    if (platform === 'native') {
      database.prepare('INSERT INTO records VALUES (?,?,?,?,?)').run(scope, kind, id, JSON.stringify(payload), version);
      database.prepare('INSERT INTO sync_queue(scope,id,kind,entity_id,payload,version,base_version) VALUES (?,?,?,?,?,?,?)').run(scope, `${kind}:${id}`, kind, id, JSON.stringify(payload), version, 3);
    } else {
      const key = `cicura-demo-v1:${scope}`; const state = JSON.parse(values.get(key) ?? '{"rows":[],"queue":[]}');
      state.rows.push({ kind, id, payload, version }); state.queue.push({ id: `${kind}:${id}`, kind, entityId: id, payload, version, baseVersion: 3, attempts: 0 }); values.set(key, JSON.stringify(state));
    }
  }
  return { storage, seed, close: () => database.close() };
}
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
for (const platform of ['native', 'web']) {
  test(`${platform}: v1.0.1 records are explicitly claimed once without changing IDs, payloads or originals`, async () => {
    const h = harness(platform);
    try {
      const patient = { id: 'upgrade-patient', name: 'Paciente sintético de atualização', birthDate: '1970-01-01' };
      h.seed('individual', 'patients', patient.id, patient);
      h.seed('individual', 'wounds', 'upgrade-wound', { id: 'upgrade-wound', patientId: patient.id, location: 'Local de teste' });
      h.seed('individual', 'visits', 'upgrade-visit', { id: 'upgrade-visit', patientId: patient.id, woundId: 'upgrade-wound', state: 'Rascunho', plan: 'Texto sintético preservado' });
      h.seed('individual', 'reports', 'upgrade-report', { id: 'upgrade-report', patientId: patient.id, snapshot: { patient } });
      h.seed('individual', 'patients', 'demo-p-0', { id: 'demo-p-0', name: 'Demo' });
      h.seed('individual', 'profiles', 'profile-legacy', { id: 'profile-legacy', name: 'Perfil não importado' });
      h.seed('org_clinic-123', 'patients', 'clinic-patient', { id: 'clinic-patient', name: 'Paciente sintético de clínica antiga' });
      h.seed('org_clinic-123', 'wounds', 'clinic-wound', { id: 'clinic-wound', patientId: 'clinic-patient' });
      h.seed('user:other-account', 'patients', 'private-other', { id: 'private-other', name: 'Outra conta nunca examinada' });
      h.seed('user:account-a', 'patients', patient.id, patient, 7);
      const before = await h.storage.readRecords('individual');
      const summary = await h.storage.listLegacyRecords();
      assert.equal(summary.total, 6); assert.equal(summary.patients, 2); assert.equal(summary.sources, 2);
      assert.equal(JSON.stringify(summary).includes('sintético'), false);
      const result = await h.storage.claimLegacyRecords('user:account-a');
      assert.equal(result.imported, 5); assert.equal(result.skipped, 1); assert.equal(result.sources, 2);
      const restored = await h.storage.readRecords('user:account-a');
      assert.equal(restored.length, 6); assert.equal(restored.find(r => r.id === patient.id || r.payload.id === patient.id).version ?? 7, 7);
      const oldVisit = before.find(r => r.payload.id === 'upgrade-visit');
      const restoredVisit = restored.find(r => r.payload.id === 'upgrade-visit');
      assert.equal(hash(restoredVisit.payload), hash(oldVisit.payload));
      assert.equal(hash(await h.storage.readRecords('individual')), hash(before));
      const queue = await h.storage.queue('user:account-a');
      assert.equal(queue.filter(r => r.entityId !== patient.id).every(r => r.baseVersion === 0), true);
      assert.equal((await h.storage.readLocalHistory('user:account-a')).filter(r => r.event === 'legacy-import').length, 5);
      assert.equal((await h.storage.listLegacyRecords()).total, 0);
      assert.equal((await h.storage.claimLegacyRecords('user:account-b')).imported, 0);
      assert.equal((await h.storage.claimLegacyRecords('user:account-a')).imported, 0);
      assert.equal((await h.storage.readRecords('user:account-b')).length, 0);
      await assert.rejects(() => h.storage.claimLegacyRecords('individual'), /conta individual/);
      await assert.rejects(() => h.storage.claimLegacyRecords('user:account-a:org:clinic'), /conta individual/);
    } finally { h.close(); }
  });
  test(`${platform}: late errors and acknowledgments cannot corrupt a newer resolved queue`, async () => {
    const h = harness(platform);
    try {
      const scope = 'user:account-a';
      await h.storage.writeRecord(scope, 'patients', 'race', { id: 'race', name: 'Primeiro' }, true);
      const [old] = await h.storage.queue(scope);
      await h.storage.writeRecord(scope, 'patients', 'race', { id: 'race', name: 'Mais novo' }, true);
      await h.storage.markError(scope, old, 'Erro de versão antiga');
      let [current] = await h.storage.queue(scope); assert.equal(current.attempts, 0); assert.equal(current.error ?? null, null);
      await h.storage.resolveQueuedRecord(scope, current, { payload: { id: 'race', name: 'Servidor' }, version: 10 }, 'local');
      await h.storage.acknowledge(scope, old);
      [current] = await h.storage.queue(scope); assert.equal(current.baseVersion, 10); assert.equal(current.version, 11);
    } finally { h.close(); }
  });
  test(`${platform}: acknowledged imported rows do not reappear in the queue`, async () => {
    const h = harness(platform);
    try {
      h.seed('individual', 'patients', 'imported', { id: 'imported', name: 'Paciente sintético' });
      await h.storage.claimLegacyRecords('user:account-a');
      const [item] = await h.storage.queue('user:account-a');
      await h.storage.acknowledge('user:account-a', item);
      assert.equal((await h.storage.queue('user:account-a')).length, 0);
      await h.storage.writeRecord('user:account-a', 'patients', 'new', { id: 'new', name: 'Novo sintético' }, true);
      assert.equal((await h.storage.queue('user:account-a')).length, 1);
    } finally { h.close(); }
  });
}
