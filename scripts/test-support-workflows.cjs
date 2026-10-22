const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
let sequence = 0;
function load(file) {
  const filename = path.resolve(file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const requireLocal = name => {
    if (name.endsWith('/data/store')) return { uid: () => `test-${++sequence}` };
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name) + '.ts');
    throw new Error(`Unexpected dependency ${name}`);
  };
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { Date, Set, Map, Number, String, Object, Error })(requireLocal, module, module.exports);
  return module.exports;
}
const inventory = load('src/features/inventory/domain/inventory.service.ts');
const base = { id: 'product', name: 'Gaze', manufacturer: '', presentation: '', unit: 'unidade', currentStock: 0, minStock: 2, lots: [] };
const entry = inventory.createInventoryMovement({ id: 'entry', item: base, type: 'entrada', quantity: 5, lotId: 'lot', lotNumber: 'A', expiryDate: '2027-02-01', now: '2026-10-22T12:00:00Z', createdBy: 'user' });

test('stock is derived from persistent movements and never drops below zero silently', () => {
  const [item] = inventory.inventoryWithMovements([base], [entry]);
  assert.equal(item.currentStock, 5); assert.equal(item.lots[0].quantity, 5);
  assert.throws(() => inventory.createInventoryMovement({ id: 'over', item, type: 'saida_descarte', quantity: 6, lotId: 'lot', createdBy: 'user', notes: 'Perda' }), /saldo suficiente/);
  for (const quantity of [0, -1, 0.5, NaN, Infinity]) assert.throws(() => inventory.createInventoryMovement({ id: 'bad', item, type: 'entrada', quantity, lotId: 'lot', lotNumber: 'A', expiryDate: '2027-02-01', createdBy: 'user' }), /inteira/);
  assert.equal(base.currentStock, 0); assert.equal(base.lots.length, 0);
});

test('expired stock cannot be consumed and a visit consumption is idempotent', () => {
  const [item] = inventory.inventoryWithMovements([base], [entry]);
  const input = { id: 'use', item, type: 'saida_atendimento', quantity: 2, lotId: 'lot', visitId: 'visit', patientId: 'patient', referenceId: 'visit:product:lot', createdBy: 'user', now: '2026-10-22T12:00:00Z' };
  const movement = inventory.createInventoryMovement(input);
  assert.equal(inventory.createInventoryMovement({ ...input, existingMovements: [movement] }).id, 'use');
  assert.throws(() => inventory.createInventoryMovement({ ...input, quantity: 1, existingMovements: [movement] }), /outros dados/);
  assert.equal(inventory.inventoryWithMovements([base], [entry, movement, { ...movement, id: 'retry' }])[0].currentStock, 3);
  assert.throws(() => inventory.createInventoryMovement({ ...input, now: '2027-02-02T12:00:00Z' }), /vencido/);
  assert.throws(() => inventory.createInventoryMovement({ ...input, visitId: '' }), /atendimento/);
  assert.equal(inventory.validISODate('2026-02-30'), false);
});

test('authorizations stay independent and revocation preserves the original evidence', () => {
  const service = load('src/features/consents/domain/consent.service.ts');
  const consent = service.recordConsent({ id: 'consent', patientId: 'patient', type: 'registro_fotografico', professionalName: 'Profissional', createdBy: 'user', acceptedBy: 'Paciente', evidence: 'Termo em papel número 24 assinado e arquivado.' });
  assert.equal(service.activeConsent([consent], 'atendimento'), undefined);
  assert.equal(service.activeConsent([consent], 'registro_fotografico').id, 'consent');
  assert.equal(consent.signatureData, undefined);
  const revoked = service.revokeConsent(consent, 'Solicitação do paciente', 'user', '2026-10-22T13:00:00Z');
  assert.equal(revoked.evidence, consent.evidence); assert.equal(revoked.signedAt, consent.signedAt); assert.equal(consent.status, 'ativo');
  assert.equal(service.activeConsent([revoked], 'registro_fotografico'), undefined);
  assert.throws(() => service.revokeConsent(revoked, 'Solicitação', 'user'), /já foi/);
  assert.throws(() => service.recordConsent({ id: 'bad', patientId: 'patient', type: 'atendimento', professionalName: 'Profissional', createdBy: 'user', acceptedBy: 'Paciente', evidence: '' }), /termo formal/);
});

test('prescription review needs explicit professional and care data and never fakes a signature', () => {
  const service = load('src/features/prescription/domain/prescription.service.ts');
  const p = service.createPrescription({ patientId: 'patient', woundId: 'wound', professional: { name: 'Nome', council: 'Conselho', registration: '123' }, createdBy: 'user' });
  assert.equal(p.cleaning, ''); assert.equal(p.status, 'draft'); assert.throws(() => service.reviewPrescription(p), /cobertura/);
  const reviewed = service.reviewPrescription({ ...p, primaryCoverage: 'Produto definido pelo profissional', changeFrequency: 'Frequência definida', expectedDuration: 'Duração definida', signatureData: [[{ x: 1, y: 1 }]] });
  assert.equal(reviewed.status, 'reviewed'); assert.equal(reviewed.signatureData, undefined);
  const copy = service.duplicatePrescription(reviewed, 'user'); assert.equal(copy.status, 'draft'); assert.equal(copy.reviewedAt, undefined); assert.equal(copy.previousId, reviewed.id);
  const { generatePrescriptionHTML } = load('src/features/prescription/ui/PrescriptionPDF.ts');
  const html = generatePrescriptionHTML({ ...reviewed, observations: '<script>alert(1)</script>' }, { id: 'patient', name: 'Nome <Paciente>' }, { id: 'wound', patientId: 'patient', location: 'Perna' });
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>|Assinatura Digital Registrada|Soro Fisiológico|48 a 72/);
  assert.match(html, /não possui assinatura digital certificada/);
  assert.throws(() => generatePrescriptionHTML(reviewed, { id: 'other' }, { id: 'wound', patientId: 'patient' }), /não corresponde/);
});

test('models start empty and stay personal until an actual clinic supports sharing', () => {
  const service = load('src/features/templates/domain/template.service.ts');
  assert.equal(service.DEFAULT_TEMPLATES.length, 0);
  assert.throws(() => service.createTemplate({ name: 'Modelo', type: 'conduta', createdBy: 'user', content: {} }), /conteúdo/);
  assert.throws(() => service.createTemplate({ name: 'Modelo', type: 'conduta', createdBy: 'user', scope: 'organization', content: { plan: 'Texto' } }), /clínica/);
  const template = service.createTemplate({ name: ' Modelo ', type: 'conduta', createdBy: 'user', content: { plan: 'Texto do profissional' } });
  assert.equal(template.scope, 'personal'); assert.equal(template.name, 'Modelo');
});

test('indicator periods filter actual completed visits, exclude deleted parents and count latest returns once', () => {
  const { summarizeIndicators } = load('src/features/analytics/domain/indicators.service.ts');
  const patients = [{ id: 'p', status: 'Ativo' }, { id: 'deleted', status: 'Ativo', deletedAt: '2026-10-01' }];
  const wounds = [{ id: 'w', patientId: 'p', status: 'Piora', etiology: 'Registrada' }, { id: 'dw', patientId: 'deleted', status: 'Ativa', etiology: '' }];
  const visit = { id: 'v', patientId: 'p', woundId: 'w', state: 'Concluído', length: '2,5', width: '2', date: '2026-10-21', returnDate: '2026-10-25' };
  const visits = [{ ...visit, id: 'old', date: '2026-09-01', returnDate: '2026-09-10' }, visit, { ...visit, id: 'deletedVisit', patientId: 'deleted', woundId: 'dw' }];
  const summary = summarizeIndicators(patients, wounds, visits, 'Últimos 30 dias', new Date(2026, 9, 22));
  assert.equal(summary.completedVisits, 1); assert.equal(summary.averageArea, 5); assert.equal(summary.activeWounds, 1); assert.equal(summary.lateReturns.length, 0);
  const wider = summarizeIndicators(patients, wounds, visits, 'Últimos 90 dias', new Date(2026, 9, 22)); assert.equal(wider.completedVisits, 2);
  const none = summarizeIndicators([], [], [], 'Ano atual', new Date(2026, 9, 22)); assert.equal(none.averageArea, null);
});
