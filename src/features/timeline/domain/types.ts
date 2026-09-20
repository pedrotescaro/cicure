export type TimelineEventType = 
  | 'atendimento' 
  | 'ferida_nova' 
  | 'mensuracao' 
  | 'fotografia' 
  | 'escala' 
  | 'produto' 
  | 'terapia' 
  | 'exame' 
  | 'medicamento'
  | 'encaminhamento' 
  | 'relatorio' 
  | 'assinatura' 
  | 'cicatrizacao'
  | 'reabertura' 
  | 'plano_terapeutico' 
  | 'prescricao' 
  | 'sinais_vitais';

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  date: string;
  professionalId: string;
  professionalName: string;
  category: string;
  referenceKind: string;
  referenceId: string;
  title: string;
  summary: string;
  icon?: string;
  badgeTone?: 'neutral' | 'red' | 'green' | 'amber';
};

export type TimelineFilter = {
  category?: TimelineEventType | 'todos';
  startDate?: string;
  endDate?: string;
};
