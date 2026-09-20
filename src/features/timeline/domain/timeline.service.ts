import type { Patient, Wound, Visit, Report } from '../../../domain/types';
import type { TimelineEvent, TimelineFilter } from './types';
import { area, decimal, number } from '../../../domain/clinical';

export function buildTimeline(
  patient: Patient,
  wounds: Wound[],
  visits: Visit[],
  reports: Report[] = []
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Feridas registradas e cicatrizações
  wounds.forEach(w => {
    events.push({
      id: `w-start-${w.id}`,
      type: 'ferida_nova',
      date: w.startDate,
      professionalId: '',
      professionalName: 'Registro clínico',
      category: 'Ferida',
      referenceKind: 'wounds',
      referenceId: w.id,
      title: `Nova Ferida: ${w.location}`,
      summary: `Etiologia: ${w.etiology}. Status inicial: ${w.status}.`,
      badgeTone: 'red'
    });

    if (w.status === 'Cicatrizada') {
      events.push({
        id: `w-healed-${w.id}`,
        type: 'cicatrizacao',
        date: visits.find(v => v.woundId === w.id && v.state === 'Concluído')?.date || w.startDate,
        professionalId: '',
        professionalName: 'Equipe clínica',
        category: 'Desfecho',
        referenceKind: 'wounds',
        referenceId: w.id,
        title: `Ferida Cicatrizada: ${w.location}`,
        summary: 'Epitelização completa alcançada com sucesso.',
        badgeTone: 'green'
      });
    }
  });

  // 2. Visitas / Atendimentos e seus componentes
  visits.forEach(v => {
    const wound = wounds.find(w => w.id === v.woundId);
    const woundLabel = wound?.location || 'Ferida';

    // Evento principal do atendimento
    if (v.state === 'Concluído') {
      events.push({
        id: `visit-${v.id}`,
        type: 'atendimento',
        date: v.date,
        professionalId: '',
        professionalName: v.signedBy || 'Profissional',
        category: 'Atendimento',
        referenceKind: 'visits',
        referenceId: v.id,
        title: `Atendimento Clínico — ${woundLabel}`,
        summary: `Plano: ${v.plan ? v.plan.slice(0, 80) + '...' : 'Evolução registrada'}`,
        badgeTone: 'neutral'
      });

      // Mensuração
      if (decimal(v.length) > 0 && decimal(v.width) > 0) {
        const calculatedArea = area(v);
        events.push({
          id: `meas-${v.id}`,
          type: 'mensuracao',
          date: v.date,
          professionalId: '',
          professionalName: v.signedBy || 'Profissional',
          category: 'Mensuração',
          referenceKind: 'visits',
          referenceId: v.id,
          title: `Mensuração: ${v.length} × ${v.width} cm`,
          summary: `Área calculada: ${number(calculatedArea)} cm² · Profundidade: ${v.depth || '0'} cm`,
          badgeTone: 'neutral'
        });
      }

      // Fotografias
      if (v.photos && v.photos.length > 0) {
        events.push({
          id: `photo-${v.id}`,
          type: 'fotografia',
          date: v.date,
          professionalId: '',
          professionalName: v.signedBy || 'Profissional',
          category: 'Fotografia',
          referenceKind: 'visits',
          referenceId: v.id,
          title: `${v.photos.length} fotografia(s) clínica(s)`,
          summary: v.photos.map(p => p.type).filter(Boolean).join(', ') || 'Fotos do leito e perilesional registradas',
          badgeTone: 'neutral'
        });
      }

      // Escalas aplicadas
      if (v.assessments && v.assessments.length > 0) {
        v.assessments.forEach(a => {
          events.push({
            id: `scale-${v.id}-${a.code}`,
            type: 'escala',
            date: a.appliedAt || v.date,
            professionalId: '',
            professionalName: a.appliedBy || v.signedBy || 'Profissional',
            category: 'Escala Clínica',
            referenceKind: 'visits',
            referenceId: v.id,
            title: `Escala ${a.code} (v${a.version})`,
            summary: `Score: ${a.score !== null ? a.score : '-'} · ${a.interpretation}`,
            badgeTone: 'amber'
          });
        });
      }

      // Produtos e coberturas aplicadas
      if (v.dressings && v.dressings.length > 0) {
        const prodNames = v.dressings.map(d => d.product).filter(Boolean).join(', ');
        if (prodNames) {
          events.push({
            id: `dress-${v.id}`,
            type: 'produto',
            date: v.date,
            professionalId: '',
            professionalName: v.signedBy || 'Profissional',
            category: 'Curativo',
            referenceKind: 'visits',
            referenceId: v.id,
            title: `Coberturas: ${prodNames}`,
            summary: v.dressings.map(d => `${d.product} (${d.layer}) - ${d.frequency}`).join('; '),
            badgeTone: 'neutral'
          });
        }
      }

      // Terapias complementares
      if (v.therapies && v.therapies.length > 0) {
        v.therapies.forEach(t => {
          events.push({
            id: `ther-${v.id}-${t.id}`,
            type: 'terapia',
            date: t.date || v.date,
            professionalId: '',
            professionalName: t.professional || v.signedBy || 'Profissional',
            category: 'Terapia',
            referenceKind: 'visits',
            referenceId: v.id,
            title: `Terapia: ${t.type}`,
            summary: `Duração: ${t.duration || 0} min. ${t.note || ''}`,
            badgeTone: 'neutral'
          });
        });
      }

      // Assinatura digital
      if (v.signature && v.signature.length > 0) {
        events.push({
          id: `sign-${v.id}`,
          type: 'assinatura',
          date: v.date,
          professionalId: '',
          professionalName: v.signedBy || 'Profissional',
          category: 'Autenticação',
          referenceKind: 'visits',
          referenceId: v.id,
          title: 'Prontuário Assinado Digitalmente',
          summary: `Assinado por ${v.signedBy || 'Profissional responsável'} com carimbo de tempo imutável.`,
          badgeTone: 'green'
        });
      }
    }
  });

  // 3. Relatórios gerados
  reports.forEach(r => {
    events.push({
      id: `rep-${r.id}`,
      type: 'relatorio',
      date: r.createdAt,
      professionalId: '',
      professionalName: 'Cicure Relatórios',
      category: 'Documentação',
      referenceKind: 'reports',
      referenceId: r.id,
      title: `Relatório Emitido: ${r.type}`,
      summary: `Documento clínico gerado para o prontuário.`,
      badgeTone: 'neutral'
    });
  });

  // 4. Medicamentos em uso
  patient.medications?.forEach((m, idx) => {
    if (m.start) {
      events.push({
        id: `med-${idx}`,
        type: 'medicamento',
        date: m.start,
        professionalId: '',
        professionalName: 'Prescrição',
        category: 'Medicamento',
        referenceKind: 'patients',
        referenceId: patient.id,
        title: `Medicamento: ${m.name} ${m.dose}`,
        summary: `Via ${m.route}, freq: ${m.frequency}. Indicação: ${m.indication}`,
        badgeTone: m.attention ? 'amber' : 'neutral'
      });
    }
  });

  // 5. Exames anexados
  patient.exams?.forEach((ex, idx) => {
    if (ex.date) {
      events.push({
        id: `exam-${idx}`,
        type: 'exame',
        date: ex.date,
        professionalId: '',
        professionalName: 'Laboratório',
        category: 'Exame',
        referenceKind: 'patients',
        referenceId: patient.id,
        title: `Exame: ${ex.type}`,
        summary: `Resultado: ${ex.value}`,
        badgeTone: 'neutral'
      });
    }
  });

  // Ordenação cronológica estrita (mais recente primeiro)
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

export function filterTimeline(events: TimelineEvent[], filter: TimelineFilter): TimelineEvent[] {
  return events.filter(e => {
    if (filter.category && filter.category !== 'todos') {
      if (e.type !== filter.category) return false;
    }
    if (filter.startDate && e.date.slice(0, 10) < filter.startDate) return false;
    if (filter.endDate && e.date.slice(0, 10) > filter.endDate) return false;
    return true;
  });
}
