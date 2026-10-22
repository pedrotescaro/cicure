import type { Patient, Wound, Profile } from '../../../domain/types';
import type { Prescription } from '../domain/types';

const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function generatePrescriptionHTML(prescription: Prescription, patient: Patient, wound: Wound, _profile?: Profile): string {
  if (prescription.patientId !== patient.id || prescription.woundId !== wound.id || wound.patientId !== patient.id) throw new Error('A prescrição não corresponde ao paciente e à ferida selecionados.');
  const fields = [
    ['Técnica de limpeza', prescription.cleaning], ['Solução', prescription.solution], ['Cobertura principal', prescription.primaryCoverage],
    ['Cobertura secundária', prescription.secondaryCoverage], ['Fixação', prescription.fixation], ['Proteção da pele ao redor', prescription.perilesionalProtection],
    ['Frequência de troca', prescription.changeFrequency], ['Duração prevista', prescription.expectedDuration], ['Orientações e observações', prescription.observations],
  ];
  const reviewed = prescription.status === 'reviewed';
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Registro de prescrição · Cicure</title><style>@page{size:A4;margin:20mm}body{font-family:Arial,sans-serif;color:#141414;line-height:1.5}h1{font-size:24px}h2{font-size:18px}table{width:100%;border-collapse:collapse}td,th{padding:10px;border:1px solid #ddd;text-align:left;vertical-align:top}th{width:32%;font-size:13px}td{white-space:pre-wrap}.notice{padding:12px;border:1px solid #999}footer{margin-top:32px;font-size:12px;color:#333}.brand{color:#D62828;font-size:24px;font-weight:bold}</style></head><body>
    <div class="brand">cicure</div><h1>Registro de prescrição de curativo</h1>
    <p class="notice">${reviewed ? 'Conteúdo revisado pelo profissional.' : 'RASCUNHO — conteúdo ainda não revisado.'} Este registro não possui assinatura digital certificada. A formalização e a validade da prescrição dependem do profissional responsável.</p>
    <p><strong>Paciente:</strong> ${escape(patient.name)}<br><strong>Ferida:</strong> ${escape(wound.location)}<br><strong>Data:</strong> ${escape(new Date(prescription.date).toLocaleDateString('pt-BR'))}</p>
    <table>${fields.map(([label, value]) => `<tr><th>${escape(label)}</th><td>${escape(value || 'Não informado pelo profissional')}</td></tr>`).join('')}</table>
    <footer><strong>${escape(prescription.professional.name || 'Profissional não informado')}</strong><br>${escape(prescription.professional.council)} ${escape(prescription.professional.registration)}<br>Registro ${escape(prescription.id)} · versão ${prescription.version}${prescription.reviewedAt ? `<br>Revisado em ${escape(new Date(prescription.reviewedAt).toLocaleString('pt-BR'))}` : ''}<p>Assinatura do profissional: ___________________________________</p></footer>
  </body></html>`;
}
