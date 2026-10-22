const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) { const module = { exports: {} }; const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; vm.runInNewContext('(function(require,module,exports){' + code + '\n})', { Date, console })(name => { if (!(name in mocks)) throw Error('Unexpected runtime dependency: ' + name); return mocks[name]; }, module, module.exports); return module.exports; }
test('clinical PDF uses edited evolution, actual measures and escaped patient content', () => {
  const { reportHtml } = load('src/features/reports/domain/report.ts');
  const report = { id: 'report', type: 'Completo', createdAt: '2026-10-22', snapshot: { patient: { name: '<script>patient</script>', birthDate: '1960-05-12' }, wound: { location: 'Perna esquerda', etiology: 'Outra' }, profile: { name: 'Profissional', council: 'TESTE', registration: '123' }, visit: { date: '2026-10-22', length: '2,5', width: '1,2', depth: '', pain: 0, tissue: {}, plan: 'Plano registrado', guidance: 'Orientacao registrada', returnDate: '', photos: [], dressings: [], therapies: [], signedBy: 'Profissional', soap: { subjective: 'Relato editado', objective: 'Exame editado', assessment: 'Avaliacao editada', plan: 'Conduta editada' } } } };
  const html = reportHtml(report);
  assert.ok(html.includes('&lt;script&gt;patient&lt;/script&gt;')); assert.ok(!html.includes('<script>'));
  for (const value of ['Relato editado', 'Exame editado', 'Avaliacao editada', 'Conduta editada', '2,5', '12/05/1960']) assert.ok(html.includes(value));
  assert.ok(html.includes('Não equivale a assinatura digital'));
  const patient = reportHtml({ ...report, type: 'Para o paciente' }); assert.ok(patient.includes('Orientacao registrada')); assert.ok(!patient.includes('Avaliacao editada'));
});
test('Android reminder scheduling has stable replacement, denied permission, cancellation and failure states', async () => {
  const calls = []; let granted = true; let fail = false;
  const notifications = { AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { DATE: 'date' }, cancelScheduledNotificationAsync: async id => calls.push(['cancel', id]), setNotificationChannelAsync: async () => {}, getPermissionsAsync: async () => ({ granted }), requestPermissionsAsync: async () => ({ granted }), scheduleNotificationAsync: async request => { if (fail) throw Error('Unavailable'); calls.push(['schedule', request]); return request.identifier; } };
  const { appointmentDate, updateAppointmentReminder } = load('src/features/agenda/domain/reminders.ts', { 'react-native': { Platform: { OS: 'android' } }, 'expo-notifications': notifications });
  assert.equal(appointmentDate({ date: '2026-02-31', scheduledTime: '09:00' }), null); assert.equal(appointmentDate({ date: '2026-10-22', scheduledTime: '25:00' }), null);
  const visit = { id: 'visit', state: 'Agendado', date: '2099-10-22', scheduledTime: '09:30' };
  const scheduled = await updateAppointmentReminder('user:a', visit); assert.equal(scheduled.reminderStatus, 'scheduled'); assert.equal(scheduled.reminderId, 'cicure:user:a:visit');
  assert.ok(!JSON.stringify(calls).includes('Paciente')); // Lock-screen notification has no patient identity.
  const second = await updateAppointmentReminder('user:a', { ...visit, scheduledTime: '10:30' }); assert.equal(second.reminderId, scheduled.reminderId);
  granted = false; assert.equal((await updateAppointmentReminder('user:a', visit)).reminderStatus, 'denied');
  assert.equal((await updateAppointmentReminder('user:a', { ...visit, deletedAt: '2026-10-22' })).reminderStatus, 'none');
  granted = true; fail = true; assert.equal((await updateAppointmentReminder('user:a', visit)).reminderStatus, 'error');
  const returned = await updateAppointmentReminder('user:a', { ...visit, state: 'Concluído', returnDate: '2099-11-02', returnTime: '11:00' }); assert.equal(returned.reminderStatus, 'error');
});
