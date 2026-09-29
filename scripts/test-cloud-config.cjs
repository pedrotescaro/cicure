const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/data/supabase.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function loadCloudConfig(env) {
  const calls = [];
  const module = { exports: {} };
  const mocks = {
    '@supabase/supabase-js': { createClient: (...args) => { calls.push(args); return { connected: true }; } },
    'expo-secure-store': {},
    'react-native': { Platform: { OS: 'web' } },
  };
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { process: { env }, URL })(name => mocks[name], module, module.exports);
  return { ...module.exports, calls };
}

test('missing or incomplete configuration never creates a cloud client', () => {
  for (const env of [{}, { EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' },
    { EXPO_PUBLIC_SUPABASE_URL: 'not-a-url', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-key' },
    { EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', EXPO_PUBLIC_SUPABASE_ANON_KEY: 'your-anon-key' }]) {
    const result = loadCloudConfig(env);
    assert.equal(result.cloudConfigured, false);
    assert.equal(result.supabase, null);
    assert.equal(result.calls.length, 0);
  }
});

test('explicit valid configuration creates only the configured client', () => {
  const result = loadCloudConfig({
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
  });
  assert.equal(result.cloudConfigured, true);
  assert.equal(result.calls.length, 1);
  assert.equal(result.calls[0][0], 'https://example.supabase.co');
  assert.equal(result.calls[0][1], 'public-key');
});
