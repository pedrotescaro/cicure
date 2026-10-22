import type { Photo, Point, Profile, Visit } from './types';
import { decimal, measurementSchema } from './clinical';

export type VisitAuthor = { userId: string; name: string; council: string; registration: string };
export const emptyVitals = () => ({ systolic: '', diastolic: '', heartRate: '', temperature: '', oxygen: '', glucose: '' });

/** Strict calendar date validation; Date.parse alone silently normalizes 31 February. */
export function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(year, month, 0).getDate();
}

export function visitAuthor(userId: string | null, profile?: Profile): VisitAuthor {
  if (!userId || !profile?.name.trim() || !profile.council.trim() || !profile.registration.trim()) {
    throw new Error('Complete nome, conselho e número de registro no seu perfil profissional antes de concluir.');
  }
  return { userId, name: profile.name.trim(), council: profile.council.trim(), registration: profile.registration.trim() };
}

const vitalLimits = {
  systolic: [20, 350, 'Pressão sistólica'], diastolic: [10, 250, 'Pressão diastólica'],
  heartRate: [10, 300, 'Frequência cardíaca'], temperature: [20, 45, 'Temperatura'],
  oxygen: [0, 100, 'Saturação de oxigênio'], glucose: [10, 1000, 'Glicemia'],
} as const;

export function vitalErrors(vitals: Visit['vitals']): string[] {
  if (!vitals) return [];
  return Object.entries(vitalLimits).flatMap(([key, [min, max, label]]) => {
    const value = vitals[key as keyof typeof vitals];
    return value && (!/^\d+(?:[.,]\d+)?$/.test(value) || decimal(value) < min || decimal(value) > max)
      ? [`${label}: informe um número de ${min} a ${max}, ou deixe em branco se não medido.`] : [];
  });
}

export function completionErrors(visit: Visit): string[] {
  const errors: string[] = [];
  if (!visit.patientId || !visit.woundId) errors.push('Selecione o paciente e a ferida.');
  if (!measurementSchema.safeParse(visit).success) errors.push('Revise as medidas: use números de 0 a 200 cm.');
  if (!(decimal(visit.length) > 0 && decimal(visit.width) > 0)) errors.push('Informe comprimento e largura maiores que zero.');
  const tissues = Object.values(visit.tissue);
  if (tissues.length && (tissues.some(n => !Number.isFinite(n) || n < 0 || n > 100) || tissues.reduce((a, b) => a + b, 0) !== 100)) {
    errors.push('Os tecidos informados devem somar 100%. Se não foram avaliados, remova a distribuição.');
  }
  if (!visit.plan.trim()) errors.push('Descreva a conduta realizada no plano de cuidado.');
  if (visit.returnDate && (!validCalendarDate(visit.returnDate) || visit.returnDate < visit.date.slice(0, 10))) errors.push('Escolha uma data de retorno válida, igual ou posterior ao atendimento.');
  if (visit.returnDate && visit.returnTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(visit.returnTime)) errors.push('Informe o horário do retorno no formato HH:mm, de 00:00 a 23:59.');
  if (visit.dressings.some(item => !item.product.trim())) errors.push('Informe o nome de cada curativo ou remova o registro vazio.');
  if (visit.therapies.some(item => !item.type.trim() || !Number.isFinite(item.duration) || item.duration < 0 || item.duration > 1440)) errors.push('Informe o nome dos procedimentos e uma duração válida de até 1.440 minutos.');
  errors.push(...vitalErrors(visit.vitals));
  return errors;
}

export function concludeVisit(visit: Visit, author: VisitAuthor, now = new Date().toISOString()): Visit {
  if (visit.state === 'Concluído') throw new Error('Este atendimento já foi concluído. Registre uma correção como adendo.');
  const errors = completionErrors(visit);
  if (errors.length) throw new Error(errors.join('\n'));
  if (!author.userId || !author.name || !author.council || !author.registration) throw new Error('Identificação profissional incompleta.');
  return { ...visit, state: 'Concluído', step: 6, returnTime: visit.returnDate ? visit.returnTime || '09:00' : '', completedAt: now, completedBy: { ...author }, signedBy: author.name, amendments: [...(visit.amendments ?? [])] };
}

export function appendVisitAmendment(visit: Visit, text: string, author: VisitAuthor, id: string, now = new Date().toISOString()): Visit {
  if (visit.state !== 'Concluído') throw new Error('Conclua o atendimento antes de adicionar um adendo.');
  if (!text.trim()) throw new Error('Descreva a informação que deseja acrescentar ou corrigir.');
  if (!author.userId || !author.name || !author.council || !author.registration) throw new Error('Identificação profissional incompleta.');
  if (!id || visit.amendments?.some(item => item.id === id)) throw new Error('Identificador de adendo inválido.');
  return { ...visit, amendments: [...(visit.amendments ?? []), { id, text: text.trim(), author: { ...author }, createdAt: now }] };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  return JSON.stringify(value);
}

/** Enforced by the persistence boundary as well as the editor. Final records only accept appended amendments. */
export function assertVisitMutation(previous: Visit | undefined, next: Visit): void {
  if (!previous || previous.state !== 'Concluído') return;
  const { amendments: before = [], reminderId: _beforeReminder, reminderStatus: _beforeReminderStatus, ...original } = previous;
  const { amendments: after = [], reminderId: _afterReminder, reminderStatus: _afterReminderStatus, ...candidate } = next;
  if (stable(original) !== stable(candidate) || after.length < before.length || before.some((item, i) => stable(item) !== stable(after[i]))) {
    throw new Error('O atendimento concluído é preservado. Faça a correção em um novo adendo.');
  }
  const ids = new Set(before.map(item => item.id));
  for (const item of after.slice(before.length)) {
    if (!item.id || ids.has(item.id) || !item.text.trim() || !item.author?.userId || !item.author.name || !item.author.council || !item.author.registration || !Number.isFinite(Date.parse(item.createdAt))) throw new Error('Adendo incompleto. Confira autoria, data e texto.');
    ids.add(item.id);
  }
}

/** Points are stored in original image pixels, never display pixels. This is a reference scale, not a clinical calibration certificate. */
export function calibratePhoto(photo: Photo, points: Point[], referenceCm: number): Photo {
  if (!(photo.width > 0 && photo.height > 0)) throw new Error('As dimensões da fotografia não estão disponíveis. Anexe a imagem novamente.');
  if (points.length !== 2 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0 || p.x > photo.width || p.y > photo.height)) throw new Error('Marque os dois extremos da referência dentro da imagem.');
  if (!Number.isFinite(referenceCm) || referenceCm < 0.1 || referenceCm > 100) throw new Error('Informe uma referência de 0,1 a 100 cm.');
  const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  if (distance < 5) throw new Error('Os pontos estão muito próximos. Amplie a referência e marque novamente.');
  return { ...photo, rulerConfirmed: true, referencePoints: points.map(p => ({ ...p })), referenceCm, pixelsPerCm: distance / referenceCm };
}
