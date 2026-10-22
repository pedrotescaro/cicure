/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newVisit } from '../src/domain/visit';
import { appendVisitAmendment, assertVisitMutation, calibratePhoto, completionErrors, concludeVisit, emptyVitals, validCalendarDate, vitalErrors, visitAuthor } from '../src/domain/visit.lifecycle';
import type { Photo, Visit } from '../src/domain/types';

const author = { userId: 'professional-1', name: 'Profissional de teste', council: 'COREN', registration: '12345' };
const measured = (): Visit => ({ ...newVisit('visit-1', 'patient-1', 'wound-1'), date: '2026-10-22T12:00:00.000Z', length: '4,5', width: '2', depth: '0,3', plan: 'Cuidado registrado pelo profissional.' });

test('draft round trip retains every step, edited evolution and all vitals without inventing findings', () => {
  for (let step = 0; step <= 6; step++) {
    const draft: Visit = { ...measured(), step, vitals: { ...emptyVitals(), systolic: '120', diastolic: '80', temperature: '36,5' }, soap: { id: 'note-1', visitId: 'visit-1', patientId: 'patient-1', subjective: 'Relato editado', objective: 'Exame editado', assessment: 'Avaliação editada', plan: 'Plano editado', status: 'Revisado', generatedFrom: 'manual', createdAt: '2026-10-22T12:00:00Z', updatedAt: '2026-10-22T12:10:00Z' } };
    const reopened = JSON.parse(JSON.stringify(draft)) as Visit;
    assert.equal(reopened.step, step); assert.equal(reopened.soap?.assessment, 'Avaliação editada');
    assert.equal(reopened.vitals?.temperature, '36,5'); assert.deepEqual(reopened.tissue, {});
    assert.equal(reopened.pain, null); assert.deepEqual(reopened.signature, []);
  }
});

test('conclusion captures actual professional identity and time without requiring a simulated signature', () => {
  assert.throws(() => visitAuthor(null), /perfil profissional/);
  const draft = measured();
  const completed = concludeVisit(draft, author, '2026-10-22T15:00:00.000Z');
  assert.equal(completed.state, 'Concluído'); assert.equal(completed.completedAt, '2026-10-22T15:00:00.000Z');
  assert.deepEqual(completed.completedBy, author); assert.deepEqual(completed.signature, []);
  assert.equal(draft.state, 'Rascunho'); assert.equal(draft.completedAt, undefined);
});

test('invalid measures, tissue distribution, clinical input and impossible calendar dates prevent completion', () => {
  assert.ok(completionErrors({ ...measured(), length: '' }).some(message => message.includes('comprimento')));
  assert.ok(completionErrors({ ...measured(), tissue: { Granulação: 70 } }).some(message => message.includes('100%')));
  assert.ok(completionErrors({ ...measured(), returnDate: '2027-02-31' }).some(message => message.includes('retorno')));
  assert.ok(completionErrors({ ...measured(), returnDate: '2026-10-23', returnTime: '29:72' }).some(message => message.includes('horário')));
  assert.ok(vitalErrors({ ...emptyVitals(), oxygen: '101' }).length);
  assert.equal(vitalErrors({ ...emptyVitals(), temperature: '36,5' }).length, 0);
  assert.equal(validCalendarDate('2024-02-29'), true); assert.equal(validCalendarDate('2026-02-29'), false);
});

test('concluded clinical content and existing amendments are immutable, with append-only corrections', () => {
  const original = concludeVisit(measured(), author, '2026-10-22T15:00:00Z');
  const amended = appendVisitAmendment(original, 'Correção: detalhe acrescentado.', author, 'amendment-1', '2026-10-22T16:00:00Z');
  assert.doesNotThrow(() => assertVisitMutation(original, amended));
  assert.equal(original.amendments?.length, 0); assert.equal(amended.plan, original.plan);
  assert.throws(() => assertVisitMutation(amended, { ...amended, plan: 'Substituição indevida' }), /preservado/);
  assert.throws(() => assertVisitMutation(amended, { ...amended, amendments: [] }), /preservado/);
  assert.throws(() => assertVisitMutation(amended, { ...amended, amendments: [{ ...amended.amendments![0], text: 'Apagado' }] }), /preservado/);
  assert.throws(() => concludeVisit(original, author), /já foi concluído/);
  assert.doesNotThrow(() => assertVisitMutation(original, { ...original, reminderId: 'notification-1', reminderStatus: 'scheduled' }));
});

test('photo reference scale is computed from two real image points and known physical distance', () => {
  const photo: Photo = { id: 'photo-1', uri: 'file://private/photo.jpg', date: '2026-10-22T12:00:00Z', width: 1000, height: 800, rulerConfirmed: false, contour: [], type: 'Leito da ferida' };
  const calibrated = calibratePhoto(photo, [{ x: 100, y: 100 }, { x: 400, y: 500 }], 2.5);
  assert.equal(calibrated.pixelsPerCm, 200); assert.equal(calibrated.referenceCm, 2.5);
  assert.equal(photo.rulerConfirmed, false);
  assert.throws(() => calibratePhoto(photo, [{ x: 1, y: 1 }, { x: 1, y: 1 }], 1), /próximos/);
  assert.throws(() => calibratePhoto(photo, [{ x: -1, y: 1 }, { x: 10, y: 10 }], 1), /dentro/);
  assert.throws(() => calibratePhoto(photo, [{ x: 1, y: 1 }, { x: 10, y: 10 }], 0), /referência/);
});
