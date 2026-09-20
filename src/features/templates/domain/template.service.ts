import type { ClinicalTemplate, TemplateType } from './types';
import { uid } from '../../../data/store';

export const DEFAULT_TEMPLATES: ClinicalTemplate[] = [
  {
    id: 'tmpl-curativo-hidrofibra',
    name: 'Curativo Hidrofibra c/ Prata (Exsudato Moderado)',
    type: 'curativo',
    description: 'Indicado para feridas com carga bacteriana elevada e exsudação moderada a alta.',
    scope: 'organization',
    content: {
      cleaning: 'Irrigação com SF 0,9% morno sem atrito',
      solution: 'Soro Fisiológico 0,9%',
      primaryCoverage: 'Hidrofibra com prata',
      secondaryCoverage: 'Compressa estéril de algodão',
      fixation: 'Fita microporosa',
      perilesionalProtection: 'Película protetora sem ardor',
      changeFrequency: 'A cada 48 a 72 horas ou sob saturação de 75%',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Equipe Cicure'
  },
  {
    id: 'tmpl-laser-ulceravenosa',
    name: 'Fotobiomodulação em Úlcera Venosa (660nm + 808nm)',
    type: 'fotobiomodulacao',
    description: 'Protocolo padrão para estímulo de síntese de colágeno e redução de dor.',
    scope: 'organization',
    content: {
      wavelength: '660nm leito / 808nm bordas',
      power: '100mW',
      energyPerPoint: '2.0 Joules por ponto',
      mode: 'Pontual em grade de 1cm²',
      duration: 15,
      notes: 'Aplicação com óculos de proteção. 1cm de distância entre os pontos perilesionais.'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Equipe Cicure'
  },
  {
    id: 'tmpl-orientacoes-diabetico',
    name: 'Orientações Domiciliares: Pé Diabético',
    type: 'orientacoes',
    description: 'Cartilha de prevenção e cuidados diários com calçados e inspeção.',
    scope: 'personal',
    content: {
      guidance: '1. Inspecione os pés diariamente com auxílio de espelho.\n2. Nunca ande descalço, mesmo dentro de casa.\n3. Lave com água morna e sabão neutro e seque bem entre os dedos.\n4. Hidrate o dorso e planta do pé, evitando os espaços interdigitais.\n5. Use calçados confortáveis sem costuras internas proeminentes.'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Caroline Ferreira'
  },
  {
    id: 'tmpl-conduta-padrao',
    name: 'Conduta Padrão de Preparo do Leito (TIME)',
    type: 'conduta',
    description: 'Estruturação baseada nos 4 pilares do acrônimo TIME.',
    scope: 'personal',
    content: {
      plan: 'Preparo do leito com remoção de esfacelo por desbridamento autolítico. Manejo de exsudato com cobertura absorvente. Proteção de bordas epiboladas e controle de biofilme.',
      returnDate: ''
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Caroline Ferreira'
  }
];

export function createTemplate(params: {
  name: string;
  type: TemplateType;
  description?: string;
  scope?: 'personal' | 'organization';
  content: Record<string, any>;
  createdBy?: string;
}): ClinicalTemplate {
  return {
    id: uid(),
    name: params.name,
    type: params.type,
    description: params.description || '',
    scope: params.scope || 'personal',
    content: params.content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: params.createdBy || 'Profissional'
  };
}

export function duplicateTemplate(source: ClinicalTemplate): ClinicalTemplate {
  return {
    ...source,
    id: uid(),
    name: `${source.name} (Cópia)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
