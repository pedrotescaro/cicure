import type { ClinicalTemplate, TemplateType } from './types';
import { uid } from '../../../data/store';

export const DEFAULT_TEMPLATES: ClinicalTemplate[] = [];

export function createTemplate(params: {
  name: string; type: TemplateType; description?: string; scope?: 'personal' | 'organization';
  content: Record<string, unknown>; createdBy?: string;
}): ClinicalTemplate {
  if (!params.name.trim()) throw new Error('Informe o nome do modelo.');
  if (!params.createdBy) throw new Error('Entre na sua conta para salvar modelos.');
  if (params.scope === 'organization') throw new Error('Modelos compartilhados precisam de uma clínica configurada. Use um modelo pessoal.');
  if (!Object.values(params.content).some(value => typeof value === 'string' && value.trim())) throw new Error('Preencha o conteúdo do modelo.');
  return { id: uid(), name: params.name.trim(), type: params.type, description: params.description?.trim() || '',
    scope: 'personal', content: params.content, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: params.createdBy };
}

export function duplicateTemplate(source: ClinicalTemplate, createdBy = source.createdBy): ClinicalTemplate {
  return { ...source, id: uid(), name: `${source.name} (cópia)`, scope: 'personal', organizationId: undefined, deletedAt: undefined,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy };
}
