import type { Point } from '../../../domain/types';

export type ConsentType = 
  | 'atendimento' 
  | 'registro_fotografico' 
  | 'compartilhamento_profissionais' 
  | 'ensino_anonimizado' 
  | 'pesquisa_anonimizada';

export type ConsentStatus = 'ativo' | 'revogado';

export type PatientConsent = {
  id: string;
  patientId: string;
  type: ConsentType;
  title: string;
  description: string;
  status: ConsentStatus;
  termVersion: string;
  signedAt: string;
  revokedAt?: string;
  revocationReason?: string;
  professionalName: string;
  signatureData?: Point[][];
};

export const CONSENT_DEFINITIONS: { type: ConsentType; title: string; description: string }[] = [
  {
    type: 'atendimento',
    title: 'Autorização para Atendimento Clínico e Curativos',
    description: 'Permite a realização de anamnese, exame físico, limpeza, desbridamento e aplicação de coberturas pelo profissional.'
  },
  {
    type: 'registro_fotografico',
    title: 'Registro Fotográfico Calibrado no Prontuário',
    description: 'Autoriza fotografar a ferida estritamente para fins de mensuração, monitoramento longitudinal e arquivo no prontuário eletrônico seguro.'
  },
  {
    type: 'compartilhamento_profissionais',
    title: 'Compartilhamento Interprofissional de Cuidados',
    description: 'Permite compartilhar relatórios e prontuário com médicos assistentes, angiologistas e equipe multiprofissional diretamente envolvida no cuidado.'
  },
  {
    type: 'ensino_anonimizado',
    title: 'Utilização Anonimizada para Ensino Clínico',
    description: 'Permite utilizar imagens e dados desidentificados em aulas, congressos e discussão acadêmica, sem qualquer dado identificador pessoal.'
  },
  {
    type: 'pesquisa_anonimizada',
    title: 'Utilização Anonimizada para Pesquisa Científica',
    description: 'Autoriza a agregação estatística em estudos clínicos observacionais e levantamentos epidemiológicos de desfechos de cicatrização.'
  }
];
