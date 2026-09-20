import type { Prescription } from './types';
import { uid } from '../../../data/store';

export function createPrescription(params: {
  patientId: string;
  woundId: string;
  cleaning?: string;
  solution?: string;
  primaryCoverage?: string;
  secondaryCoverage?: string;
  fixation?: string;
  perilesionalProtection?: string;
  changeFrequency?: string;
  expectedDuration?: string;
  observations?: string;
  professional: {
    name: string;
    council: string;
    registration: string;
  };
  createdBy?: string;
}): Prescription {
  return {
    id: uid(),
    patientId: params.patientId,
    woundId: params.woundId,
    cleaning: params.cleaning || '',
    solution: params.solution || '',
    primaryCoverage: params.primaryCoverage || '',
    secondaryCoverage: params.secondaryCoverage || '',
    fixation: params.fixation || '',
    perilesionalProtection: params.perilesionalProtection || '',
    changeFrequency: params.changeFrequency || '',
    expectedDuration: params.expectedDuration || '',
    observations: params.observations || '',
    professional: params.professional,
    date: new Date().toISOString(),
    version: 1,
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy || 'Profissional'
  };
}

export function duplicatePrescription(source: Prescription): Prescription {
  return {
    ...source,
    id: uid(),
    date: new Date().toISOString(),
    version: 1,
    signatureData: undefined,
    createdAt: new Date().toISOString(),
  };
}

export function prescriptionToTemplateContent(presc: Prescription): Record<string, unknown> {
  return {
    cleaning: presc.cleaning,
    solution: presc.solution,
    primaryCoverage: presc.primaryCoverage,
    secondaryCoverage: presc.secondaryCoverage,
    fixation: presc.fixation,
    perilesionalProtection: presc.perilesionalProtection,
    changeFrequency: presc.changeFrequency,
    expectedDuration: presc.expectedDuration,
    observations: presc.observations,
  };
}
