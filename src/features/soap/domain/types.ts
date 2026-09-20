export type SOAPStatus = 'Rascunho' | 'Revisado' | 'Confirmado';
export type SOAPGeneratedFrom = 'manual' | 'auto-draft';

export type SOAPNote = {
  id: string;
  visitId: string;
  patientId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  status: SOAPStatus;
  generatedFrom: SOAPGeneratedFrom;
  confirmedAt?: string;
  confirmedBy?: string;
  createdAt: string;
  updatedAt: string;
};
