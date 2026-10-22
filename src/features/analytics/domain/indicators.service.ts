import type { Patient, Visit, Wound } from '../../../domain/types';

export type IndicatorPeriod = 'Últimos 30 dias' | 'Últimos 90 dias' | 'Ano atual';
const day = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function summarizeIndicators(patients: Patient[], wounds: Wound[], visits: Visit[], period: IndicatorPeriod, now = new Date()) {
  const today = day(now);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'Ano atual') start.setMonth(0, 1);
  else start.setDate(start.getDate() - (period === 'Últimos 90 dias' ? 89 : 29));
  const since = day(start);
  const visiblePatients = patients.filter(p => !p.deletedAt);
  const patientIds = new Set(visiblePatients.map(p => p.id));
  const visibleWounds = wounds.filter(w => !w.deletedAt && patientIds.has(w.patientId));
  const woundIds = new Set(visibleWounds.map(w => w.id));
  const visibleVisits = visits.filter(v => !v.deletedAt && patientIds.has(v.patientId) && woundIds.has(v.woundId));
  const completed = visibleVisits.filter(v => v.state === 'Concluído' && v.date.slice(0, 10) >= since && v.date.slice(0, 10) <= today);
  const recentByWound = new Map<string, Visit>();
  for (const visit of visibleVisits.filter(v => v.state === 'Concluído' && v.date.slice(0, 10) <= today).sort((a, b) => a.date.localeCompare(b.date))) recentByWound.set(visit.woundId, visit);
  const lateReturns = [...recentByWound.values()].filter(v => v.returnDate && v.returnDate < today);
  const measuredAreas = completed.flatMap(v => {
    const length = Number(v.length.replace(',', '.')); const width = Number(v.width.replace(',', '.'));
    return v.length.trim() && v.width.trim() && Number.isFinite(length) && Number.isFinite(width) && length > 0 && width > 0 ? [length * width] : [];
  });
  const etiologyCounts = visibleWounds.reduce<Record<string, number>>((counts, wound) => { const key = wound.etiology.trim() || 'Não informada'; counts[key] = (counts[key] || 0) + 1; return counts; }, {});
  return { since, today, completedVisits: completed.length, patientsAttended: new Set(completed.map(v => v.patientId)).size,
    activePatients: visiblePatients.filter(p => p.status === 'Ativo').length,
    activeWounds: visibleWounds.filter(w => w.status !== 'Cicatrizada').length,
    healedWounds: visibleWounds.filter(w => w.status === 'Cicatrizada').length,
    scheduledVisits: visibleVisits.filter(v => v.state === 'Agendado' && v.date.slice(0, 10) >= since && v.date.slice(0, 10) <= today).length,
    drafts: visibleVisits.filter(v => v.state === 'Rascunho' && v.date.slice(0, 10) >= since && v.date.slice(0, 10) <= today).length,
    lateReturns, measuredVisits: measuredAreas.length, averageArea: measuredAreas.length ? measuredAreas.reduce((a, b) => a + b, 0) / measuredAreas.length : null, etiologyCounts };
}
