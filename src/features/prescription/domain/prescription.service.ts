import type { Prescription } from './types';
import { uid } from '../../../data/store';

export function createPrescription(params: {
  patientId: string; woundId: string; cleaning?: string; solution?: string; primaryCoverage?: string;
  secondaryCoverage?: string; fixation?: string; perilesionalProtection?: string; changeFrequency?: string;
  expectedDuration?: string; observations?: string; professional: Prescription['professional']; createdBy?: string;
}): Prescription {
  if (!params.patientId || !params.woundId || !params.createdBy) throw new Error('Selecione o paciente, a ferida e entre na sua conta.');
  return { id: uid(), patientId: params.patientId, woundId: params.woundId, cleaning: params.cleaning?.trim() || '',
    solution: params.solution?.trim() || '', primaryCoverage: params.primaryCoverage?.trim() || '', secondaryCoverage: params.secondaryCoverage?.trim() || '',
    fixation: params.fixation?.trim() || '', perilesionalProtection: params.perilesionalProtection?.trim() || '', changeFrequency: params.changeFrequency?.trim() || '',
    expectedDuration: params.expectedDuration?.trim() || '', observations: params.observations?.trim() || '', professional: params.professional,
    date: new Date().toISOString(), version: 1, createdAt: new Date().toISOString(), createdBy: params.createdBy, status: 'draft' };
}

export function reviewPrescription(prescription: Prescription, now = new Date().toISOString()): Prescription {
  if (!prescription.professional.name.trim() || !prescription.professional.council.trim() || !prescription.professional.registration.trim()) throw new Error('Complete nome, conselho e registro no seu perfil profissional antes de revisar.');
  if (!prescription.primaryCoverage.trim() || !prescription.changeFrequency.trim() || !prescription.expectedDuration.trim()) throw new Error('Informe cobertura principal, frequência de troca e duração antes de revisar.');
  if (prescription.status === 'archived') throw new Error('Crie uma cópia do registro arquivado para revisar.');
  return { ...prescription, status: 'reviewed', reviewedAt: now, signatureData: undefined };
}

export function duplicatePrescription(source: Prescription, createdBy = source.createdBy): Prescription {
  return { ...source, id: uid(), date: new Date().toISOString(), version: source.version + 1, previousId: source.id,
    signatureData: undefined, status: 'draft', reviewedAt: undefined, createdAt: new Date().toISOString(), createdBy };
}

export function prescriptionToTemplateContent(p: Prescription): Record<string, unknown> {
  return { cleaning: p.cleaning, solution: p.solution, primaryCoverage: p.primaryCoverage, secondaryCoverage: p.secondaryCoverage,
    fixation: p.fixation, perilesionalProtection: p.perilesionalProtection, changeFrequency: p.changeFrequency,
    expectedDuration: p.expectedDuration, observations: p.observations };
}
