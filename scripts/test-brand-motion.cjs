const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext('(function(module,exports){' + source + '\n})', {})(module, module.exports);
  return module.exports;
}
const { brandFrame, brandTimeline, canDismissBrand } = load('src/ui/brand/brandTimeline.ts');
test('brand sequence draws and turns the C before revealing the point and letters', () => {
  const start = brandFrame(0);
  assert.equal(start.rotation, -360);
  assert.equal(start.draw, 0);
  assert.equal(start.dot, 0);
  assert.equal(start.letter, 0);
  assert.ok(brandFrame(700).draw > 0.9);
  assert.equal(brandFrame(700).dot, 0);
  assert.equal(brandFrame(1100).rotation, 0);
  assert.ok(brandFrame(1100).dot > 0);
  assert.equal(brandFrame(1100).letter, 0);
  assert.ok(brandFrame(1400, 0).letter > brandFrame(1400, 4).letter);
});
test('animation settles to the full wordmark and remains bounded through delayed frames', () => {
  for (let t = -200; t <= 5000; t += 13) {
    for (let letter = 0; letter < 5; letter++) {
      const frame = brandFrame(t, letter);
      for (const value of Object.values(frame)) assert.ok(Number.isFinite(value));
      for (const key of ['draw', 'fill', 'dot', 'expand', 'letter']) assert.ok(frame[key] >= 0 && frame[key] <= 1);
      assert.ok(frame.dotScale >= 0 && frame.dotScale <= 1.15);
      assert.ok(frame.rotation >= -360 && frame.rotation <= 0);
    }
  }
  for (let letter = 0; letter < 5; letter++) {
    const end = brandFrame(brandTimeline.duration, letter);
    for (const key of ['draw', 'fill', 'dot', 'dotScale', 'expand', 'letter']) assert.equal(end[key], 1);
  }
});
test('completed or reduced animation never dismisses before application resources are ready', () => {
  assert.equal(canDismissBrand(false, false), false);
  assert.equal(canDismissBrand(false, true), false);
  assert.equal(canDismissBrand(true, false), false);
  assert.equal(canDismissBrand(true, true), true);
});
test('wordmark suffix preserves original Comfortaa letter geometry without a duplicate text C', () => {
  const { cicurePaths } = load('src/ui/brand/cicurePaths.ts');
  assert.equal(cicurePaths.letters.slice(1).map(letter => letter.letter).join(''), 'icure');
  const { monogramGeometry, wordmarkGeometry } = load('src/ui/brand/monogramGeometry.ts');
  assert.ok(monogramGeometry.dot.cx + monogramGeometry.dot.r < wordmarkGeometry.suffixX);
  assert.ok(wordmarkGeometry.suffixY + (80.2 - wordmarkGeometry.suffixOriginY) * wordmarkGeometry.suffixScale < wordmarkGeometry.height);
});
