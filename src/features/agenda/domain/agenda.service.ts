import type { Visit } from '../../../domain/types';

export type AgendaEntry = { id: string; visit: Visit; kind: 'appointment' | 'return'; date: string; time: string };
export function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
export function validTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function buildAgendaEntries(visits: Visit[]): AgendaEntry[] {
  return visits.filter(visit => !visit.deletedAt).flatMap((visit): AgendaEntry[] => {
    if (visit.state === 'Agendado') return [{ id: `appointment-${visit.id}`, visit, kind: 'appointment', date: visit.date.slice(0, 10), time: visit.scheduledTime }];
    if (visit.state !== 'Concluído' || !visit.returnDate) return [];
    const alreadyAttended = visits.some(later => !later.deletedAt && later.state === 'Concluído' && later.id !== visit.id && later.woundId === visit.woundId && later.date > visit.date && later.date.slice(0, 10) >= visit.returnDate);
    return alreadyAttended ? [] : [{ id: `return-${visit.id}`, visit, kind: 'return', date: visit.returnDate, time: visit.returnTime || '09:00' }];
  }).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

export function reminderLabel(visit: Visit) {
  switch (visit.reminderStatus) {
    case 'scheduled': return 'Lembrete agendado no aparelho';
    case 'denied': return 'Lembrete não autorizado. Ative as notificações nas configurações do Android.';
    case 'error': return 'O lembrete não foi agendado. Tente salvar o agendamento novamente.';
    case 'unsupported': return 'Lembretes disponíveis no aplicativo Android';
    default: return 'Sem lembrete agendado';
  }
}
