import type { SyncItem, ConflictResolution } from './types';
import { logAuditEvent } from '../../security/domain/security.service';

/**
 * Retorna o tempo de espera em milissegundos usando exponential backoff:
 * base (1s) * 2^tentativa com jitter e teto de 60s
 */
export function calculateBackoffMs(attempts: number): number {
  const baseMs = 1000;
  const maxMs = 60000;
  const calculated = baseMs * Math.pow(2, attempts);
  const jitter = Math.random() * 500;
  return Math.min(calculated + jitter, maxMs);
}

export const INITIAL_SYNC_ITEMS: SyncItem[] = [
  {
    id: 'sync-1',
    idempotencyKey: 'idem-atend-001',
    entityKind: 'visits',
    entityId: 'demo-v-0-0',
    title: 'Atendimento Clínico — Maria Helena Santos',
    status: 'sincronizado',
    version: 1,
    attempts: 1,
    lastAttemptAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'sync-2',
    idempotencyKey: 'idem-atend-002',
    entityKind: 'visits',
    entityId: 'demo-v-1-0',
    title: 'Atendimento Clínico — João Carlos Oliveira',
    status: 'aguardando',
    version: 2,
    attempts: 0
  },
  {
    id: 'sync-3',
    idempotencyKey: 'idem-atend-003',
    entityKind: 'visits',
    entityId: 'demo-v-2-0',
    title: 'Curativo & Mensuração — Ana Lúcia Ferreira',
    status: 'conflito',
    version: 3,
    attempts: 1,
    lastAttemptAt: new Date(Date.now() - 600000).toISOString(),
    errorMessage: 'Versão concorrente detectada no servidor',
    localData: {
      medida: '4.2 × 2.8 cm',
      tecido: 'Granulação 80%, Esfacelo 20%',
      cobertura: 'Hidrofibra com prata',
      observacao: 'Avaliação feita no domicílio pelo Tablet'
    },
    remoteData: {
      medida: '4.0 × 2.5 cm',
      tecido: 'Granulação 90%, Esfacelo 10%',
      cobertura: 'Espuma com prata',
      observacao: 'Edição simultânea realizada no Consultório'
    }
  }
];

export function resolveSyncConflict(
  resolution: ConflictResolution,
  items: SyncItem[]
): SyncItem[] {
  // Registra a resolução no log de auditoria obrigatório
  logAuditEvent({
    action: 'conflict_resolve',
    actionLabel: `Conflito de versão resolvido (${resolution.resolutionType})`,
    entityKind: 'visits',
    entityId: resolution.syncItemId,
    metadata: { resolutionType: resolution.resolutionType }
  });

  return items.map(item => {
    if (item.id === resolution.syncItemId) {
      return {
        ...item,
        status: 'sincronizado',
        errorMessage: undefined
      };
    }
    return item;
  });
}
