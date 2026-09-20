export type AlertSeverity = 'info' | 'aviso' | 'urgente';

export type AlertType = 
  | 'alergia_produto'
  | 'alteracao_area'
  | 'retorno_atrasado'
  | 'sem_melhora'
  | 'sinais_infeccao'
  | 'reavaliacao_escala';

export type ClinicalAlert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  recommendation: string;
  patientId: string;
  woundId?: string;
  ruleVersion: string;
  createdAt: string;
};
