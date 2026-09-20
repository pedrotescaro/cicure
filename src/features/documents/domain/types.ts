export type DocumentType = 
  | 'pdf' 
  | 'imagem' 
  | 'exame' 
  | 'laudo' 
  | 'receita' 
  | 'encaminhamento' 
  | 'outro';

export type PatientDocument = {
  id: string;
  patientId: string;
  woundId?: string;
  visitId?: string;
  title: string;
  type: DocumentType;
  fileName: string;
  fileSize?: string;
  storagePath: string;
  createdAt: string;
  createdBy: string;
};
