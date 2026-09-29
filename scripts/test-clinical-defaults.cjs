const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { Date })(name => mocks[name], module, module.exports);
  return module.exports;
}

test('a new visit has no unassessed clinical findings or assumed appointment time', () => {
  const { newVisit } = load('src/domain/visit.ts');
  const visit = newVisit('visit-1', 'patient-1', 'wound-1');
  assert.equal(visit.state, 'Rascunho');
  assert.equal(visit.scheduledTime, '');
  assert.deepEqual(Object.keys(visit.tissue), []);
  assert.equal(visit.exudateAmount, '');
  assert.equal(visit.exudateType, '');
  assert.equal(visit.odor, '');
  assert.equal(visit.pain, null);
  assert.equal(visit.assessments.length, 0);
  assert.equal(visit.signature.length, 0);
});

test('a clean workspace has no sample clinic, members or accepted demo invite', () => {
  const service = load('src/features/organization/domain/organization.service.ts', {
    '../../../data/store': { uid: () => 'test-id' },
  });
  assert.equal(service.DEFAULT_ORGS.length, 1);
  assert.equal(service.DEFAULT_ORGS[0].isIndividual, true);
  assert.equal(service.DEFAULT_ORGS[0].patientsCount, 0);
  assert.equal(service.DEFAULT_ORGS[0].membersCount, 0);
  assert.equal(service.DEFAULT_ORGS[0].email, undefined);
  assert.equal(service.DEFAULT_MEMBERS.length, 0);
  const result = service.joinOrganizationByCode('CIC-8241', service.DEFAULT_ORGS);
  assert.equal(result.org, undefined);
  assert.throws(() => service.inviteMember('org', 'Exemplo', 'exemplo@example.com', 'Profissional'), /não estão disponíveis/);
  assert.match(result.error, /não estão disponíveis/);
});

test('own JSON export requires an identified author and makes no FHIR claim', () => {
  const { buildPatientExportPacket } = load('src/features/export/domain/export.service.ts');
  assert.throws(() => buildPatientExportPacket({ id: 'patient-1' }, [], [], [], ''), /Identificação/);
  const packet = buildPatientExportPacket({ id: 'patient-1' }, [], [], [], 'Profissional de teste');
  assert.equal(packet.format, 'cicure-json');
  assert.equal(packet.exportedBy, 'Profissional de teste');
  assert.equal('interoperability' in packet, false);
  assert.doesNotMatch(packet.version, /FHIR/);
});

test('SOAP draft keeps unassessed pain and exudate explicitly unknown', () => {
  const { newVisit } = load('src/domain/visit.ts');
  const { generateSOAPDraft } = load('src/features/soap/domain/soap.service.ts', {
    '../../../domain/clinical': { decimal: Number, area: () => 0, number: String },
    '../../../data/store': { uid: () => 'note-1' },
  });
  const note = generateSOAPDraft(newVisit('visit-1', 'patient-1', 'wound-1'), { id: 'patient-1' }, {
    id: 'wound-1', location: 'perna', etiology: 'não informada', status: 'Em avaliação',
  });
  assert.match(note.subjective, /Dor não informada/);
  assert.doesNotMatch(note.subjective, /ausência de dor/);
  assert.match(note.objective, /quantidade não informada/);
  assert.doesNotMatch(note.objective, /quantidade moderada/);
});
