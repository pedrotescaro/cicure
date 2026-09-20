export type ReferralPriority = 'Rotina' | 'Prioritário' | 'Urgente';
export type ReferralStatus = 'solicitado' | 'agendado' | 'realizado' | 'cancelado';

export type Referral = {
  id: string;
  patientId: string;
  woundId?: string;
  specialty: string;
  destinationService: string;
  reason: string;
  observations?: string;
  priority: ReferralPriority;
  status: ReferralStatus;
  date: string;
  attachments?: string[];
  createdAt: string;
  createdBy: string;
};

export const REFERRAL_SPECIALTIES = [
  'Cirurgia Vascular',
  'Angiologia',
  'Infectologia',
  'Dermatologia',
  'Endocrinologia',
  'Fisioterapia Dermatofuncional',
  'Nutrição Clínica',
  'Ortopedia / Cirurgia do Pé',
  'Outra Especialidade'
] as const;
