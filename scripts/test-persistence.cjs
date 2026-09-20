const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

function harness(platform) {
  const values = new Map();
  let cloud = null;
  let failPreferences = false;
  const localStorage = {
    getItem: key => { if (failPreferences) throw Error('Disk unavailable'); return values.get(key) ?? null; },
    setItem: (key, value) => { if (failPreferences) throw Error('Disk unavailable'); values.set(key, value); },
  };
  const database = new DatabaseSync(':memory:');
  const sql = {
    execAsync: async query => database.exec(query),
    getAllAsync: async (query, ...args) => database.prepare(query).all(...args),
    getFirstAsync: async (query, ...args) => database.prepare(query).get(...args),
    runAsync: async (query, ...args) => database.prepare(query).run(...args),
    withExclusiveTransactionAsync: async fn => {
      database.exec('BEGIN');
      try { await fn(sql); database.exec('COMMIT'); }
      catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
  const alerts = [];
  function loadApp() {
    const cache = new Map();
    const mocks = {
      'react-native': { Alert: { alert: (...args) => alerts.push(args) } },
      'expo-crypto': { randomUUID: require('node:crypto').randomUUID },
      '@tanstack/react-query': { QueryClient: class { async invalidateQueries() {} } },
      'expo-sqlite': { openDatabaseAsync: async () => sql },
      'expo-sqlite/kv-store': { getItemSync: localStorage.getItem, setItemSync: localStorage.setItem },
    };
    function load(file) {
      if (cache.has(file)) return cache.get(file).exports;
      const module = { exports: {} }; cache.set(file, module);
      const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
      const localRequire = name => {
        if (mocks[name]) return mocks[name];
        if (name === './supabase') return { get supabase() { return cloud; } };
        if (name.endsWith('organization.service')) return { INDIVIDUAL_ORG: { id: 'individual', isIndividual: true }, DEFAULT_ORGS: [] };
        if (!name.startsWith('.')) return require(name);
        let next = path.resolve(path.dirname(file), name);
        next += platform === 'web' && fs.existsSync(next + '.web.ts') ? '.web.ts' : '.ts';
        return load(next);
      };
      vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { localStorage, console })(localRequire, module, module.exports);
      return module.exports;
    }
    return { store: load(path.resolve('src/data/store.ts')).useStore, storage: load(path.resolve(`src/data/storage${platform === 'web' ? '.web' : ''}.ts`)) };
  }
  return { loadApp, alerts, setCloud: value => { cloud = value; }, fail: value => { failPreferences = value; }, close: () => database.close() };
}

for (const platform of ['web', 'native']) {
  test(`${platform}: preferences survive relaunch; first display is remembered even before completion`, async () => {
    const h = harness(platform);
    try {
      let { store } = h.loadApp();
      store.getState().loadPreferences();
      assert.equal(store.getState().themeMode, 'system');
      assert.equal(store.getState().onboardingVisible, true);
      store.getState().markOnboardingSeen();
      for (const mode of ['light', 'dark', 'system']) {
        store.getState().setThemeMode(mode);
        store = h.loadApp().store;
        store.getState().loadPreferences();
        assert.equal(store.getState().themeMode, mode);
        assert.equal(store.getState().onboardingVisible, false);
        await store.getState().init('another-workspace');
        assert.equal(store.getState().themeMode, mode);
        assert.equal(store.getState().onboardingVisible, false);
      }
      h.fail(true);
      store.getState().setThemeMode('dark');
      assert.equal(store.getState().themeMode, 'system');
      assert.equal(h.alerts.length, 1);
      const failed = h.loadApp().store;
      failed.getState().loadPreferences();
      assert.equal(failed.getState().preferencesReady, false);
      assert.ok(failed.getState().preferencesError);
      h.fail(false);
      failed.getState().loadPreferences();
      assert.equal(failed.getState().preferencesReady, true);
    } finally { h.close(); }
  });

  test(`${platform}: migration removes fixtures and their queue, preserves real records, never reseeds`, async () => {
    const h = harness(platform);
    try {
      const { store, storage } = h.loadApp();
      const scope = 'individual';
      const fixtures = [
        ['patients', 'demo-p-0', { name: 'Example' }],
        ['wounds', 'demo-w-0', { patientId: 'demo-p-0' }],
        ['visits', 'demo-v-0-0', { patientId: 'demo-p-0' }],
        ['visits', 'new-demo-visit', { patientId: 'demo-p-0' }],
        ['reports', 'demo-report', { snapshot: { patient: { id: 'demo-p-0' } } }],
        ['profiles', 'demo', { name: 'Example professional' }],
        ['patients', 'real-patient', { name: 'Maria Helena Santos' }],
        ['visits', 'real-visit', { patientId: 'real-patient' }],
      ];
      for (const [kind, id, payload] of fixtures) await storage.writeRecord(scope, kind, id, { id, ...payload }, true);
      await store.getState().init();
      assert.deepEqual(Array.from(store.getState().data.patients, p => p.id), ['real-patient']);
      assert.deepEqual(Array.from(store.getState().data.visits, p => p.id), ['real-visit']);
      assert.equal((await storage.queue(scope)).length, 2);
      await store.getState().init();
      assert.equal((await storage.readRecords(scope)).length, 2);
      await store.getState().init('fresh');
      assert.equal(store.getState().data.patients.length, 0);
      assert.equal((await storage.readRecords('fresh')).length, 0);
      await store.getState().save('patients', { id: 'created', name: 'Real patient' });
      const reopened = h.loadApp().store;
      await reopened.getState().init('fresh');
      assert.equal(reopened.getState().data.patients[0].id, 'created');
    } finally { h.close(); }
  });
}


test('sync keeps failed writes queued and rejects returning demo records', async () => {
  const h = harness('web');
  try {
    const { store, storage } = h.loadApp();
    await store.getState().init();
    await store.getState().save('patients', { id: 'real', name: 'Real patient' });
    h.setCloud({
      rpc: async () => ({ error: new Error('relation does not exist') }),
      from: () => ({ upsert: async () => ({ error: new Error('relation does not exist') }) }),
    });
    await store.getState().sync();
    assert.equal((await storage.queue('individual')).length, 1);
    assert.notEqual(store.getState().syncState, 'synced');
    h.setCloud({ rpc: async name => name === 'save_record' ? { error: null } : { data: [
      { kind: 'patients', id: 'demo-p-0', payload: { id: 'demo-p-0' }, version: 1 },
      { kind: 'patients', id: 'remote-real', payload: { id: 'remote-real' }, version: 1 },
    ], error: null } });
    await store.getState().sync();
    assert.equal((await storage.queue('individual')).length, 0);
    assert.equal(store.getState().data.patients.length, 2);
    assert.equal(store.getState().data.patients.some(p => p.id === 'demo-p-0'), false);
    assert.equal(store.getState().syncState, 'synced');
  } finally { h.close(); }
});
