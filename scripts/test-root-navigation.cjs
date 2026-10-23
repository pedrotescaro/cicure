const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Evaluate the actual root JSX and access gate with deterministic hook values.
// This exercises first-login/storage transitions without mocking their JSX decisions
// and needs neither native modules nor a second React renderer dependency.
let currentPath = '/';
let online = true;
let rootStateIndex = 0;
let splashVisible = true;
const state = {
  preferencesReady: true, preferencesError: null, onboardingVisible: true,
  ready: true, authUserId: null, workMode: 'individual', error: null,
  init() {}, setAuthUser() {}, clearAuthUser() {}, loadPreferences() {}, markOnboardingSeen() {}, finishOnboarding() {},
};
const useStore = selector => selector ? selector(state) : state;
useStore.getState = () => state;
const react = {
  createContext: value => ({ value, Provider: Symbol('Provider') }),
  useContext: context => context.value,
  useState: initial => {
    const index = rootStateIndex++;
    return [index === 0 ? splashVisible : typeof initial === 'function' ? initial() : initial, value => { if (index === 0) splashVisible = value; }];
  },
  useEffect() {}, useCallback: callback => callback, useMemo: calculate => calculate(),
};
const jsx = (type, props, key) => ({ type, props: props || {}, key });
const Stack = Symbol('RootStack');
const Login = Symbol('Login');
const colors = { bg: '#FAFAFA', red: '#D62828' };
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'expo-router': { Stack, usePathname: () => currentPath },
    'react-native': { View: 'View', ActivityIndicator: 'ActivityIndicator', Platform: { OS: 'android' }, AppState: {} },
    '@tanstack/react-query': { QueryClientProvider: 'QueryClientProvider' },
    'expo-font': { useFonts: () => [true, null] },
    'expo-splash-screen': { preventAutoHideAsync: () => Promise.resolve(), setOptions() {} },
    '@expo-google-fonts/comfortaa': {}, '@expo-google-fonts/inter': {},
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
  };
  const requireMock = name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('/RootScreenGate') || name === './root-screen-state') return load(path.resolve(path.dirname(file), name + (name.endsWith('root-screen-state') ? '.ts' : '.tsx')));
    if (name.endsWith('/store')) return { useStore, queryClient: {} };
    if (name.endsWith('/supabase')) return { supabase: null };
    if (name.endsWith('/theme')) return { useTheme: () => ({ colors, isDark: false }) };
    if (name.endsWith('/useMotionPreferences')) return { useMotionPreferences: () => ({ reduceMotion: false }) };
    if (name.endsWith('/network')) return { useNetworkStatus: () => ({ isOnline: online }) };
    if (name.endsWith('/AuthScreen')) return { __esModule: true, default: Login };
    if (name.endsWith('/components') || name === '../components') return { Button: 'Button', Txt: 'Txt' };
    if (name.endsWith('/preferences')) return { readPreference: () => null };
    if (name.endsWith('/AnimatedSplash')) return { AnimatedSplash: 'AnimatedSplash' };
    if (name.endsWith('/OnboardingModal')) return { OnboardingModal: 'OnboardingModal' };
    if (name.endsWith('/AppLockModal')) return { AppLockModal: 'AppLockModal' };
    throw new Error('Unexpected dependency: ' + name);
  };
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { Promise, setTimeout, clearTimeout })(requireMock, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
const root = load(path.resolve('app/_layout.tsx'));
const gate = load(path.resolve('src/ui/navigation/RootScreenGate.tsx'));
const PrivatePage = { type: 'PrivatePage', props: {} };
function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)];
}
function renderRoot(patch = {}) {
  Object.assign(state, patch);
  rootStateIndex = 0;
  const tree = root.default();
  const navigators = nodes(tree, node => node.type === Stack);
  assert.equal(navigators.length, 1, 'Root navigator must exist while login/storage/access content changes.');
  const providers = nodes(tree, node => node.type === gate.RootScreenAccess.Provider);
  assert.equal(providers.length, 1);
  gate.RootScreenAccess.value = providers[0].props.value;
  const layout = navigators[0].props.screenLayout({ children: PrivatePage, route: { name: currentPath.startsWith('/auth/') ? currentPath.slice(1) : '(tabs)' } });
  return { navigator: navigators[0], content: gate.RootScreenGate(layout.props), tree };
}

test('actual root keeps the same navigator and layout through first login, storage initialization and onboarding', () => {
  const before = renderRoot({ authUserId: null, ready: true, preferencesReady: false });
  assert.notEqual(before.content, PrivatePage);
  const login = renderRoot({ preferencesReady: true });
  assert.equal(login.content.type, Login);
  nodes(login.tree, node => node.type === 'AnimatedSplash')[0].props.onFinish();
  for (let attempt = 0; attempt < 3; attempt++) {
    const initializing = renderRoot({ authUserId: 'account-A', ready: false });
    assert.notEqual(initializing.content, PrivatePage, 'Private routes must not mount before records are ready.');
    assert.equal(initializing.navigator.type, before.navigator.type);
    assert.equal(initializing.navigator.props.screenLayout, before.navigator.props.screenLayout);
    const initialized = renderRoot({ ready: true, onboardingVisible: true });
    assert.equal(initialized.content, PrivatePage);
    assert.equal(initialized.navigator.props.screenLayout, before.navigator.props.screenLayout);
    const onboarding = nodes(initialized.tree, node => node.type === 'OnboardingModal')[0];
    assert.equal(onboarding.props.visible, true, 'First-login onboarding appears after records and the launch splash are ready.');
    const logout = renderRoot({ authUserId: null, ready: false });
    assert.equal(logout.content.type, Login);
  }
});

test('clinic connection loss and retry block private screens without removing their navigator', () => {
  online = false;
  const blocked = renderRoot({ authUserId: 'account-A', ready: true, workMode: 'group', error: null });
  assert.notEqual(blocked.content, PrivatePage);
  online = true;
  const retry = renderRoot({ ready: false });
  assert.notEqual(retry.content, PrivatePage);
  const restored = renderRoot({ ready: true });
  assert.equal(restored.content, PrivatePage);
  assert.equal(restored.navigator.props.screenLayout, blocked.navigator.props.screenLayout);
  const revoked = renderRoot({ error: 'Acesso revogado.' });
  assert.notEqual(revoked.content, PrivatePage);
});

test('authentication callback remains available without mounting a private route', () => {
  currentPath = '/auth/callback';
  const callback = renderRoot({ authUserId: null, ready: false, workMode: 'individual', error: null });
  assert.equal(callback.content, PrivatePage, 'Here the supplied child represents the allowed auth callback.');
  currentPath = '/';
  assert.equal(renderRoot().content.type, Login);
});
