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

function pdfHarness({ beforeShareAvailability, beforePrintToFile } = {}) {
  const scope = 'user:account-a';
  const state = { scope, presentation: false };
  const calls = [];
  const report = { id: 'report', uri: 'file:///app/clinical/user-account-a/reports/cicure-report.pdf' };
  const assertAccess = () => {
    if (state.scope !== scope || state.presentation) throw new Error('Report access changed');
  };
  const pdf = load('src/features/reports/domain/pdf.ts', {
    'react-native': { Platform: { OS: 'android' } },
    './report': { reportHtml: () => '<html>Confidential test report</html>' },
    'expo-print': {
      printAsync: async options => { calls.push(['preview', options]); },
      printToFileAsync: async () => {
        calls.push(['generate']);
        if (beforePrintToFile) await beforePrintToFile();
        return { uri: 'file:///cache/generated-report.pdf' };
      },
    },
    'expo-sharing': {
      isAvailableAsync: async () => {
        calls.push(['available']);
        if (beforeShareAvailability) await beforeShareAvailability();
        return true;
      },
      shareAsync: async uri => { calls.push(['share', uri]); },
    },
    'expo-file-system/legacy': {
      documentDirectory: 'file:///app/',
      getInfoAsync: async () => ({ exists: true, size: 32 }),
      makeDirectoryAsync: async uri => { calls.push(['directory', uri]); },
      copyAsync: async options => { calls.push(['copy', options]); },
    },
  });
  return { pdf, scope, state, report, assertAccess, calls };
}

test('a pending report export cannot share after the account changes during availability lookup', async () => {
  let enteredAvailability;
  const entered = new Promise(resolve => { enteredAvailability = resolve; });
  let finishAvailability;
  const pendingAvailability = new Promise(resolve => { finishAvailability = resolve; });
  const h = pdfHarness({ beforeShareAvailability: async () => { enteredAvailability(); await pendingAvailability; } });
  const exporting = h.pdf.shareReport(h.report, h.scope, h.assertAccess);
  await entered;
  h.state.scope = 'user:account-b';
  finishAvailability();
  await assert.rejects(exporting, /Report access changed/);
  assert.equal(h.calls.filter(([action]) => action === 'share').length, 0);

  // An unchanged account still reaches Android sharing through the same helper.
  h.state.scope = h.scope;
  await h.pdf.shareReport(h.report, h.scope, h.assertAccess);
  assert.equal(h.calls.filter(([action]) => action === 'share').length, 1);
});

test('report preview is blocked in presentation mode before opening native printing', async () => {
  const h = pdfHarness();
  h.state.presentation = true;
  await assert.rejects(() => h.pdf.previewReport(h.report, h.assertAccess), /Report access changed/);
  assert.equal(h.calls.filter(([action]) => action === 'preview').length, 0);
  h.state.presentation = false;
  await h.pdf.previewReport(h.report, h.assertAccess);
  assert.equal(h.calls.filter(([action]) => action === 'preview').length, 1);
});

test('a PDF finishing after an account change is not copied into persistent account storage', async () => {
  let enteredPrinting;
  const entered = new Promise(resolve => { enteredPrinting = resolve; });
  let finishPrinting;
  const pendingPrinting = new Promise(resolve => { finishPrinting = resolve; });
  const h = pdfHarness({ beforePrintToFile: async () => { enteredPrinting(); await pendingPrinting; } });
  const generating = h.pdf.createReportPdf(h.report, h.scope, h.assertAccess);
  await entered;
  h.state.scope = 'user:account-b';
  finishPrinting();
  await assert.rejects(generating, /Report access changed/);
  assert.equal(h.calls.filter(([action]) => action === 'generate').length, 1);
  assert.equal(h.calls.filter(([action]) => action === 'directory' || action === 'copy').length, 0);
});
