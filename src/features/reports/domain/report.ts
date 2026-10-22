import type { Report } from '../../../domain/types';
export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
export function reportDate(value: string): string { const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value); return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Não informado'; }
export function reportHtml(report: Report): string {
  const { patient, wound, visit, profile } = report.snapshot;
  const row = (label: string, value: unknown) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || 'Não informado')}</p>`;
  const section = (title: string, content: string) => `<section><h2>${escapeHtml(title)}</h2>${content}</section>`;
  const clinical = report.type !== 'Para o paciente';
  const soap = visit.soap;
  const body = [
    section('Identificação', row('Paciente', patient.name) + row('Nascimento', reportDate(patient.birthDate)) + row('Ferida', wound.location) + row('Data do atendimento', reportDate(visit.date)) + row('Profissional', `${profile.name} · ${profile.council} ${profile.registration}`)),
    clinical ? section('Avaliação registrada pelo profissional', row('Origem da ferida', wound.etiology) + row('Comprimento (cm)', visit.length) + row('Largura (cm)', visit.width) + row('Profundidade (cm)', visit.depth) + row('Dor (0 a 10)', visit.pain === null ? 'Não informada' : String(visit.pain)) + row('Exsudato', [visit.exudateAmount, visit.exudateType].filter(Boolean).join(' · ')) + row('Tecidos (%)', Object.entries(visit.tissue).map(([name, value]) => `${name}: ${value}`).join('; '))) : '',
    clinical && soap ? section('Evolução clínica', row('Relato do paciente', soap.subjective) + row('Exame e medidas', soap.objective) + row('Avaliação profissional', soap.assessment) + row('Plano de cuidado', soap.plan)) : '',
    section('Plano e orientações', row('Plano de cuidado', visit.plan) + row('Orientações', visit.guidance) + row('Retorno', visit.returnDate ? `${reportDate(visit.returnDate)} às ${visit.returnTime || '09:00'}` : 'Não agendado')),
    visit.dressings.length ? section('Coberturas registradas', visit.dressings.map(dressing => row(dressing.product, `${dressing.quantity} · ${dressing.frequency} · ${dressing.note}`)).join('')) : '',
    clinical && visit.therapies.length ? section('Terapias registradas', visit.therapies.map(therapy => row(therapy.type, `${Object.entries(therapy.parameters).map(([key, value]) => `${key}: ${value}`).join('; ')} · ${therapy.note}`)).join('')) : '',
    clinical && visit.vitals ? section('Sinais vitais', Object.entries(visit.vitals).map(([key, value]) => row(({ systolic: 'Pressão sistólica (mmHg)', diastolic: 'Pressão diastólica (mmHg)', heartRate: 'Frequência cardíaca (bpm)', temperature: 'Temperatura (°C)', oxygen: 'Saturação (%)', glucose: 'Glicemia (mg/dL)' } as Record<string, string>)[key], value)).join('')) : '',
    section('Fotografias', `<p>${visit.photos.length} fotografia(s) vinculada(s) a esta ferida no prontuário privado.</p><p>As fotografias não são incluídas automaticamente no arquivo compartilhável.</p>`),
    visit.amendments?.length ? section('Correções posteriores', visit.amendments.map(amendment => row(`${reportDate(amendment.createdAt)} · ${amendment.author.name}`, amendment.text)).join('')) : '',
    section('Autoria e conclusão', row('Concluído em', reportDate(visit.completedAt || visit.date)) + row('Responsável', visit.completedBy ? `${visit.completedBy.name} · ${visit.completedBy.council} ${visit.completedBy.registration}` : visit.signedBy) + '<p>Registro confirmado pelo profissional autenticado. Não equivale a assinatura digital com certificado.</p>'),
  ].join('');
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório Cicure</title><style>@page{margin:20mm}body{font:12pt Arial,sans-serif;color:#141414;line-height:1.5}h1{color:#b01f1f;font-size:24pt}h2{font-size:15pt;margin-top:24px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:5px 0}section{break-inside:avoid}footer{margin-top:32px;font-size:10pt;color:#555}</style></head><body><h1>cicure</h1><h2>Relatório ${escapeHtml(report.type.toLowerCase())}</h2>${body}<footer>Gerado em ${reportDate(report.createdAt)}. Documento confidencial. Compartilhe somente com destinatários autorizados. O Cicure apoia o registro; avaliação e conduta são de responsabilidade do profissional.</footer></body></html>`;
}
