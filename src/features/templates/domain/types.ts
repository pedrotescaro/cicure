export type TemplateType = 
  | 'curativo' 
  | 'fotobiomodulacao' 
  | 'escalas' 
  | 'orientacoes' 
  | 'conduta' 
  | 'prescricao';

export type TemplateScope = 'personal' | 'organization';

export type ClinicalTemplate = {
  id: string;
  name: string;
  type: TemplateType;
  description: string;
  scope: TemplateScope;
  organizationId?: string;
  content: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  curativo: 'Protocolo de Curativo',
  fotobiomodulacao: 'Fotobiomodulação / Laser',
  escalas: 'Conjunto de Escalas',
  orientacoes: 'Orientações ao Paciente',
  conduta: 'Modelo de Conduta',
  prescricao: 'Prescrição Clínica'
};
