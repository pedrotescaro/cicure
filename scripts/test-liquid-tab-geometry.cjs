const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(source, mocks = {}, context = {}) {
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext('(function(require,module,exports){' + compiled + '\n})', context)(name => mocks[name], module, module.exports);
  return module.exports;
}
const theme = load(fs.readFileSync('src/ui/theme.ts', 'utf8'), { 'react-native': {}, '../data/store': {} });
const motion = load(fs.readFileSync('src/ui/motion.ts', 'utf8'), { './theme': theme });
const source = ts.createSourceFile('LiquidTabBar.tsx', fs.readFileSync('src/ui/navigation/LiquidTabBar.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const geometry = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'liquidLensGeometry');
assert.ok(geometry, 'The production geometry function must exist');
const { liquidLensGeometry } = load(geometry.getText(source), {}, { metrics: motion.navigationMetrics, liquidMotion: motion.liquidMotion });

test('resting lens keeps its established size and alignment', () => {
  const frame = liquidLensGeometry(69, 131, 62, 0, 336, 72);
  assert.equal(frame.width, 62);
  assert.equal(frame.height, 44);
  assert.equal(frame.x, 69);
  assert.equal(frame.y, 5);
});

test('spring overshoot and rapid reversals stay inside compact and expanded capsules', () => {
  let samples = 0;
  for (const barWidth of [280, 336, 390, 520]) {
    const base = Math.min(62, (barWidth - 12) / 5 - 10);
    for (const fontScale of [1, 1.3, 2]) {
      const barHeight = 72 + Math.max(0, fontScale - 1) * 52;
      for (const inflation of [-1, 0, 0.25, 0.8, 1, 1.5]) {
        for (let edge = -200; edge <= barWidth + 200; edge += 13) {
          for (const separation of [-500, -62, 0, 62, 500]) {
            const frame = liquidLensGeometry(edge, edge + separation, base, inflation, barWidth, barHeight);
            for (const value of Object.values(frame)) assert.equal(Number.isFinite(value), true);
            assert.ok(frame.x >= 2 && frame.x + frame.width <= barWidth - 2 + 1e-8);
            assert.ok(frame.y >= 2 && frame.y + frame.height <= barHeight - 2 + 1e-8);
            assert.ok(frame.width <= base * motion.liquidMotion.maxStretch + 1e-8);
            assert.ok(frame.height >= 40 && frame.height <= 62);
            samples++;
          }
        }
      }
    }
  }
  assert.ok(samples > 10000);
});

test('vertical inflation survives the safety clamp without crossing the top edge', () => {
  const resting = liquidLensGeometry(69, 131, 62, 0, 336, 72);
  const inflated = liquidLensGeometry(69, 131, 62, 1, 336, 72);
  assert.ok(inflated.height > resting.height + 15);
  assert.ok(inflated.width > resting.width);
  assert.equal(inflated.y, 2);
});

test('dark glass uses a soft light reflection instead of a dark opaque scratch', () => {
  const dark = motion.getGlassColors(true);
  assert.equal(dark.lowerReflection, 'rgba(255, 255, 255, 0.06)');
  assert.notEqual(dark.edge, theme.darkColors.border);
  assert.equal(dark.active, theme.darkColors.red);
});
