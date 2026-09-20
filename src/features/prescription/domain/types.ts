import type { Point } from '../../../domain/types';

export type Prescription = {
  id: string;
  patientId: string;
  woundId: string;
  cleaning: string;
  solution: string;
  primaryCoverage: string;
  secondaryCoverage: string;
  fixation: string;
  perilesionalProtection: string;
  changeFrequency: string;
  expectedDuration: string;
  observations: string;
  professional: {
    name: string;
    council: string;
    registration: string;
  };
  date: string;
  signatureData?: Point[][];
  templateId?: string;
  version: number;
  createdAt: string;
  createdBy: string;
};
