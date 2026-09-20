import type { Visit, Dressing, Therapy } from '../../../domain/types';

/**
 * Fields that are SAFE to copy from a previous visit.
 * These represent ongoing treatment data that tends to persist.
 */
const COPYABLE_FIELDS: (keyof Visit)[] = [
  'dressings',
  'therapies',
  'plan',
  'guidance',
];

/**
 * Fields that MUST NOT be copied — they require fresh clinical evaluation.
 */
const NEVER_COPY: (keyof Visit)[] = [
  'length', 'width', 'depth',    // novas medidas obrigatórias
  'tissue',                       // tecido do leito pode mudar
  'pain',                         // dor precisa de nova avaliação
  'exudateAmount', 'exudateType', // exsudato pode mudar
  'infection',                    // sinais de infecção precisam de reavaliação
  'assessments',                  // scores das escalas são por atendimento
  'photos',                       // fotos são únicas por atendimento
  'signature', 'signedBy',       // assinatura é por atendimento
  'edges', 'perilesional',       // aspecto pode mudar
  'odor',                        // pode mudar
];

/**
 * Copies safe fields from a previous visit into a new blank visit.
 * NEVER copies measurements, pain, tissue, infection, scores, photos, or signature.
 * Returns warnings about what needs fresh evaluation.
 */
export function duplicateVisit(
  source: Visit,
  target: Visit,
): { visit: Visit; warnings: string[] } {
  const visit: Visit = { ...target };

  // Copy only safe fields
  for (const field of COPYABLE_FIELDS) {
    const value = source[field];
    if (value !== undefined && value !== null && value !== '') {
      (visit as any)[field] = 
        Array.isArray(value) ? [...value] : 
        typeof value === 'object' ? { ...value } : value;
    }
  }

  const warnings: string[] = [
    'As medidas da ferida precisam ser reavaliadas.',
    'A dor (EVA) deve ser verificada novamente.',
    'O tecido do leito deve ser redistribuído.',
    'Os sinais de infecção precisam ser reavaliados.',
    'As escalas clínicas precisam de nova aplicação.',
    'Novas fotografias devem ser anexadas.',
  ];

  return { visit, warnings };
}

/**
 * Returns a human-readable summary of what was copied.
 */
export function duplicateSummary(source: Visit): string[] {
  const items: string[] = [];
  if (source.dressings && source.dressings.length > 0) {
    items.push(`Produtos: ${source.dressings.map((d: Dressing) => d.product).join(', ')}`);
  }
  if (source.therapies && source.therapies.length > 0) {
    items.push(`Terapias: ${source.therapies.map((t: Therapy) => t.type).join(', ')}`);
  }
  if (source.plan) {
    items.push('Conduta anterior');
  }
  if (source.guidance) {
    items.push('Orientações anteriores');
  }
  return items;
}
