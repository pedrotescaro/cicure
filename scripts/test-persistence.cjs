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
      '@tanstack/react-query': { QueryClient: class { async invalidateQueries() {} clear() {} } },
      'expo-sqlite': { openDatabaseAsync: async () => sql },
      'expo-sqlite/kv-store': { getItemSync: localStorage.getItem, setItemSync: localStorage.setItem },
    };
    function load(file) {
      if (cache.has(file)) return cache.get(file).exports;
      const module = { exports: {} }; cache.set(file, module);
      const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
      const localRequire = name => {
        if (mocks[name]) return mocks[name];
        if (name === './supabase') return { get supabase() { return cloud; }, createAccountClient: async () => cloud };
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
        store.getState().setAuthUser('user-a');
        await store.getState().init('user:user-a');
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
      const scope = 'user:user-a';
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
      store.getState().setAuthUser('user-a');
      await store.getState().init(scope);
      assert.deepEqual(Array.from(store.getState().data.patients, p => p.id), ['real-patient']);
      assert.deepEqual(Array.from(store.getState().data.visits, p => p.id), ['real-visit']);
      assert.equal((await storage.queue(scope)).length, 2);
      await store.getState().init(scope);
      assert.equal((await storage.readRecords(scope)).length, 2);
      store.getState().clearAuthUser();
      store.getState().setAuthUser('user-b');
      const fresh = 'user:user-b';
      await store.getState().init(fresh);
      assert.equal(store.getState().data.patients.length, 0);
      assert.equal((await storage.readRecords(fresh)).length, 0);
      await store.getState().save('patients', { id: 'created', name: 'Real patient' });
      const reopened = h.loadApp().store;
      reopened.getState().setAuthUser('user-b');
      await reopened.getState().init(fresh);
      assert.equal(reopened.getState().data.patients[0].id, 'created');
      await assert.rejects(() => reopened.getState().init(scope), /Entre na sua conta/);
    } finally { h.close(); }
  });
}


test('sync keeps failed writes queued and rejects returning demo records', async () => {
  const h = harness('web');
  try {
    const { store, storage } = h.loadApp();
    const scope = 'user:user-a';
    store.getState().setAuthUser('user-a');
    await store.getState().init(scope);
    await store.getState().save('patients', { id: 'real', name: 'Real patient' });
    h.setCloud({
      rpc: async () => ({ error: new Error('relation does not exist') }),
      from: () => ({ upsert: async () => ({ error: new Error('relation does not exist') }) }),
    });
    await store.getState().sync();
    assert.equal((await storage.queue(scope)).length, 1);
    assert.notEqual(store.getState().syncState, 'synced');
    h.setCloud({ rpc: async (name, args) => name === 'save_record' ? { data: { id: args.p_id, version: args.p_version }, error: null } : { data: [
      { kind: 'patients', id: 'demo-p-0', payload: { id: 'demo-p-0' }, version: 1 },
      { kind: 'patients', id: 'remote-real', payload: { id: 'remote-real' }, version: 1 },
    ], error: null } });
    await store.getState().sync();
    assert.equal((await storage.queue(scope)).length, 0);
    assert.equal(store.getState().data.patients.length, 2);
    assert.equal(store.getState().data.patients.some(p => p.id === 'demo-p-0'), false);
    assert.equal(store.getState().syncState, 'synced');
  } finally { h.close(); }
});

function snapshotFixture() {
  return {
    data: {
      patients: [{ id: 'patient-a', name: 'Paciente A' }, { id: 'patient-b', name: 'Paciente B' }],
      wounds: [{ id: 'wound-a', patientId: 'patient-a', location: 'Local A' }, { id: 'wound-b', patientId: 'patient-b', location: 'Local B' }],
      visits: [{ id: 'visit-a', patientId: 'patient-a', woundId: 'wound-a' }, { id: 'visit-b', patientId: 'patient-b', woundId: 'wound-b' }],
      reports: [{ id: 'report-a', patientId: 'patient-a', visitId: 'visit-a' }, { id: 'report-b', patientId: 'patient-b', visitId: 'visit-b' }],
      profiles: [], products: [], care_plans: [], referrals: [], documents: [], inventory_items: [], inventory_movements: [], clinical_templates: [], consents: [], prescriptions: [],
    },
    presentation: false, themeMode: 'system', scope: 'user:account-a', authUserId: 'account-a', ready: true,
    syncState: 'local', pending: 0,
  };
}

// Check the useSyncExternalStore contract against selectors in the actual source:
// repeat reads of an unchanged store must return Object.is-equal snapshots.
test('every application store selector has a stable snapshot for unchanged populated and empty stores', () => {
  const sourceFiles = [];
  const walk = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(target);
    }
  };
  walk('app'); walk('src');
  const populated = snapshotFixture();
  const empty = { ...populated, data: Object.fromEntries(Object.keys(populated.data).map(kind => [kind, []])) };
  let checked = 0;
  for (const file of sourceFiles) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useStore' && node.arguments.length) {
        const selector = node.arguments[0];
        assert.ok(ts.isArrowFunction(selector) || ts.isFunctionExpression(selector), `${file}: selector form needs snapshot coverage`);
        const code = ts.transpileModule(`module.exports = ${selector.getText(source)};`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
        const module = { exports: {} };
        vm.runInNewContext(code, { module, id: 'patient-a', patientId: 'patient-a' });
        const line = source.getLineAndCharacterOfPosition(selector.getStart(source)).line + 1;
        for (const state of [populated, empty]) assert.ok(Object.is(module.exports(state), module.exports(state)), `${file}:${line} allocates a new snapshot without a store update`);
        checked++;
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.ok(checked > 0, 'No application store selectors were discovered');
});

function screenSnapshotHarness(file) {
  const snapshotReaders = [];
  const timelineInputs = [];
  const react = {
    useCallback: callback => callback,
    useDebugValue: () => {},
    useMemo: factory => factory(),
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useSyncExternalStore: (_subscribe, getSnapshot) => {
      const first = getSnapshot();
      assert.ok(Object.is(first, getSnapshot()), `${file}: React received uncached external-store snapshots`);
      snapshotReaders.push(getSnapshot);
      return first;
    },
  };
  // Execute the installed Zustand React hook, substituting only React's host
  // renderer boundary so the actual getSnapshot callback can be exercised in Node.
  const zustandModule = { exports: {} };
  vm.runInNewContext('(function(require,module,exports){' + fs.readFileSync(require.resolve('zustand/react'), 'utf8') + '\n})', {})(name => name === 'react' ? react : require(name), zustandModule, zustandModule.exports);
  const store = zustandModule.exports.create(() => snapshotFixture());
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { View: 'View', FlatList: 'FlatList', Pressable: 'Pressable', StyleSheet: { create: styles => styles } },
    'expo-router': { useLocalSearchParams: () => ({ id: 'patient-a' }), useRouter: () => ({ replace() {}, push() {} }) },
    'lucide-react-native': { ChevronLeft: 'ChevronLeft' },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const localRequire = name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('/data/store')) return { useStore: store };
    if (name.endsWith('/ui/theme')) return { fonts: {}, useTheme: () => ({ colors: {} }) };
    if (name.endsWith('/ui/components')) return { Badge: 'Badge', Empty: 'Empty', IconButton: 'IconButton', Pills: 'Pills', Txt: 'Txt', safeBack() {}, s: {} };
    if (name.endsWith('/BodyMapView')) return { __esModule: true, default: 'BodyMapView' };
    if (name.endsWith('/domain/clinical')) return { dateLabel: value => value };
    if (name.endsWith('/timeline.service')) return {
      buildTimeline: (patient, wounds, visits, reports) => { timelineInputs.push({ patient, wounds, visits, reports }); return []; },
      filterTimeline: events => events,
    };
    throw Error('Unexpected screen dependency: ' + name);
  };
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', {})(localRequire, module, module.exports);
  return { store, render: props => module.exports.default(props), snapshotReaders, timelineInputs };
}

test('body map uses cached Zustand snapshots and still receives newly saved wounds for its patient', () => {
  const h = screenSnapshotHarness('app/patient/[id]/body-map.tsx');
  let element = h.render();
  assert.equal(element.type, 'BodyMapView');
  assert.deepEqual(Array.from(element.props.wounds, wound => wound.id), ['wound-a']);
  h.store.setState(state => ({ data: { ...state.data, wounds: [...state.data.wounds, { id: 'new-wound', patientId: 'patient-a', location: 'Nova ferida' }] } }));
  element = h.render();
  assert.deepEqual(Array.from(element.props.wounds, wound => wound.id), ['wound-a', 'new-wound']);
  for (const read of h.snapshotReaders) assert.ok(Object.is(read(), read()));
});

test('timeline uses cached Zustand snapshots and filters saved wounds, visits and reports by patient', () => {
  const h = screenSnapshotHarness('src/features/timeline/ui/TimelineScreen.tsx');
  h.render({ patientId: 'patient-a' });
  let input = h.timelineInputs.at(-1);
  assert.deepEqual(Array.from(input.wounds, wound => wound.id), ['wound-a']);
  assert.deepEqual(Array.from(input.visits, visit => visit.id), ['visit-a']);
  assert.deepEqual(Array.from(input.reports, report => report.id), ['report-a']);
  h.store.setState(state => ({ data: { ...state.data, visits: [...state.data.visits, { id: 'new-visit', patientId: 'patient-a', woundId: 'wound-a' }] } }));
  h.render({ patientId: 'patient-a' });
  input = h.timelineInputs.at(-1);
  assert.deepEqual(Array.from(input.visits, visit => visit.id), ['visit-a', 'new-visit']);
  h.render({ patientId: 'patient-b' });
  input = h.timelineInputs.at(-1);
  assert.deepEqual(Array.from(input.wounds, wound => wound.id), ['wound-b']);
  assert.deepEqual(Array.from(input.visits, visit => visit.id), ['visit-b']);
  assert.deepEqual(Array.from(input.reports, report => report.id), ['report-b']);
});
