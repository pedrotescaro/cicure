import type { Patient, Wound, Visit } from '../../../domain/types';
import type { SOAPNote } from './types';
import { area, decimal, number } from '../../../domain/clinical';
import { uid } from '../../../data/store';

export function generateSOAPDraft(
  visit: Visit,
  patient: Patient,
  wound: Wound
): SOAPNote {
  // 1. Subjetivo (S)
  const subjectiveLines: string[] = [];
  if (visit.pain !== undefined && visit.pain > 0) {
    subjectiveLines.push(`Nível de dor relatado: EVA ${visit.pain}/10.`);
  } else {
    subjectiveLines.push('Paciente refere ausência de dor local relevante (EVA 0/10).');
  }
  if (visit.guidance) {
    subjectiveLines.push(`Queixas/relatos contextuais: refere cumprimento das orientações anteriores.`);
  }
  const subjective = subjectiveLines.join(' ');

  // 2. Objetivo (O)
  const objectiveLines: string[] = [];
  objectiveLines.push(`Lesão localizada em ${wound.location} (Etiologia: ${wound.etiology}).`);
  
  if (decimal(visit.length) > 0 && decimal(visit.width) > 0) {
    const calcArea = area(visit);
    objectiveLines.push(`Dimensões: ${visit.length} cm (comp) × ${visit.width} cm (larg) × ${visit.depth || '0'} cm (prof). Área: ${number(calcArea)} cm².`);
  }
  
  if (visit.tunnels) {
    objectiveLines.push(`Túneis/Solapamentos: ${visit.tunnels}.`);
  }

  // Tecidos
  const tissues = Object.entries(visit.tissue || {})
    .filter(([_, val]) => val > 0)
    .map(([name, val]) => `${name}: ${val}%`)
    .join(', ');
  if (tissues) {
    objectiveLines.push(`Composição do leito: ${tissues}.`);
  }

  // Exsudato e bordas
  objectiveLines.push(`Exsudato: quantidade ${visit.exudateAmount || 'moderada'}, aspecto ${visit.exudateType || 'seroso'}, odor ${visit.odor || 'ausente'}.`);
  if (visit.edges && visit.edges.length > 0) {
    objectiveLines.push(`Bordas: ${visit.edges.join(', ')}.`);
  }
  if (visit.perilesional && visit.perilesional.length > 0) {
    objectiveLines.push(`Pele perilesional: ${visit.perilesional.join(', ')}.`);
  }
  if (visit.infection && visit.infection.length > 0) {
    objectiveLines.push(`Sinais flogísticos observados: ${visit.infection.join(', ')}.`);
  }
  if (visit.photos && visit.photos.length > 0) {
    objectiveLines.push(`Fotografias clínicas: ${visit.photos.length} registro(s) anexado(s) com calibração.`);
  }
  const objective = objectiveLines.join(' ');

  // 3. Avaliação (A)
  const assessmentLines: string[] = [];
  assessmentLines.push(`Ferida com status de "${wound.status}".`);
  if (visit.assessments && visit.assessments.length > 0) {
    visit.assessments.forEach(ass => {
      assessmentLines.push(`Escala ${ass.code}: score ${ass.score} (${ass.interpretation}).`);
    });
  }
  if (visit.infection && visit.infection.length >= 2) {
    assessmentLines.push('Atenção: presença de múltiplos sinais de alerta para colonização crítica/infecção local.');
  }
  const assessment = assessmentLines.join(' ');

  // 4. Plano (P)
  const planLines: string[] = [];
  if (visit.dressings && visit.dressings.length > 0) {
    const products = visit.dressings.map(d => `${d.product} (${d.layer})`).join(', ');
    planLines.push(`Curativo realizado: ${products}.`);
  }
  if (visit.therapies && visit.therapies.length > 0) {
    const therapies = visit.therapies.map(t => `${t.type} (${t.duration || 0} min)`).join(', ');
    planLines.push(`Terapias complementares: ${therapies}.`);
  }
  if (visit.plan) {
    planLines.push(`Conduta: ${visit.plan}.`);
  }
  if (visit.guidance) {
    planLines.push(`Orientações ao paciente: ${visit.guidance}.`);
  }
  if (visit.returnDate) {
    planLines.push(`Retorno agendado para: ${visit.returnDate}.`);
  }
  const plan = planLines.join(' ');

  return {
    id: uid(),
    visitId: visit.id,
    patientId: patient.id,
    subjective,
    objective,
    assessment,
    plan,
    status: 'Rascunho',
    generatedFrom: 'auto-draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
