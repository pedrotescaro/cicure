const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { Date })(() => {}, module, module.exports);
  return module.exports;
}
const patientForm = load('src/features/patients/domain/patient-form.ts');
const agenda = load('src/features/agenda/domain/agenda.service.ts');

test('patient registration preserves unknown clinical information and creates no invented wound', () => {
  const values = { ...patientForm.patientFormValues(), name: 'Maria de teste', comorbidities: 'diabetes' };
  const patient = patientForm.buildPatient(values, 'patient');
  assert.equal(patient.birthDate, '');
  assert.equal(patient.weight, 0);
  assert.equal(patient.height, 0);
  assert.equal(patient.bloodType, '');
  assert.equal(patient.smoking, '');
  assert.equal(patient.comorbidities[0].date, '');
  assert.equal('wound' in patient, false);
});

test('patient validation rejects impossible dates, future birthdays, invalid CPF and short phone', () => {
  const values = { ...patientForm.patientFormValues(), name: 'Maria de teste', birthDate: '2026-02-31', cpf: '11111111111', phone: '9999' };
  const errors = patientForm.patientFormErrors(values, new Date('2026-10-22T12:00:00'));
  assert.ok(errors.birthDate); assert.ok(errors.cpf); assert.ok(errors.phone);
  assert.ok(patientForm.patientFormErrors({ ...values, birthDate: '2027-01-01' }, new Date('2026-10-22T12:00:00')).birthDate);
  assert.equal(patientForm.validCpf('529.982.247-25'), true);
  assert.equal(Object.keys(patientForm.patientFormErrors({ ...patientForm.patientFormValues(), name: 'Maria de teste', birthDate: '1980-02-29' }, new Date('2026-10-22T12:00:00'))).length, 0);
});

test('patient edit preserves medical measurements and dated comorbidity history', () => {
  const previous = patientForm.buildPatient({ ...patientForm.patientFormValues(), name: 'Maria', comorbidities: 'diabetes' }, 'patient');
  previous.weight = 81; previous.medications = [{ name: 'Registro conhecido' }]; previous.comorbidities[0].date = '2020-01-02';
  const next = patientForm.buildPatient({ ...patientForm.patientFormValues(previous), name: 'Maria atualizada' }, 'patient', previous);
  assert.equal(next.weight, 81); assert.equal(next.medications[0].name, 'Registro conhecido'); assert.equal(next.comorbidities[0].date, '2020-01-02');
});

test('patient name search accepts accents and uppercase without losing Portuguese', () => {
  assert.equal(patientForm.normalizedPatientSearch('  JOÃO DA CONCEIÇÃO '), 'joao da conceicao');
});

test('agenda contains scheduled appointments and returns without mutating completed visits', () => {
  const visits = [{ id: 'booked', state: 'Agendado', date: '2026-10-24T12:00:00', scheduledTime: '14:30' }, { id: 'done', state: 'Concluído', date: '2026-10-20T12:00:00', woundId: 'wound', returnDate: '2026-10-24', returnTime: '10:00' }, { id: 'cancelled', state: 'Agendado', deletedAt: '2026-10-22', date: '2026-10-24', scheduledTime: '12:00' }, { id: 'draft', state: 'Rascunho', date: '2026-10-22' }];
  const before = JSON.stringify(visits);
  const entries = agenda.buildAgendaEntries(visits);
  assert.equal(entries.length, 2); assert.equal(entries[0].kind, 'return'); assert.equal(entries[0].time, '10:00'); assert.equal(entries[1].visit.id, 'booked');
  assert.equal(JSON.stringify(visits), before);
});

test('agenda consumes a return only after a later completed visit for the same wound', () => {
  const completed = { id: 'first', state: 'Concluído', date: '2026-10-20', woundId: 'wound', returnDate: '2026-10-24' };
  assert.equal(agenda.buildAgendaEntries([completed, { id: 'other', state: 'Concluído', date: '2026-10-25', woundId: 'other' }]).length, 1);
  assert.equal(agenda.buildAgendaEntries([completed, { id: 'next', state: 'Concluído', date: '2026-10-25', woundId: 'wound' }]).length, 0);
  assert.equal(agenda.buildAgendaEntries([completed])[0].time, '09:00');
});

test('reminder wording never claims scheduling before native confirmation', () => {
  assert.equal(agenda.reminderLabel({ reminderStatus: 'scheduled' }), 'Lembrete agendado no aparelho');
  for (const reminderStatus of ['none', 'denied', 'error', 'unsupported', undefined]) assert.notEqual(agenda.reminderLabel({ reminderStatus }), 'Lembrete agendado no aparelho');
  assert.equal(agenda.validTime('23:59'), true); assert.equal(agenda.validTime('24:00'), false); assert.equal(agenda.validTime('9:00'), false);
});
