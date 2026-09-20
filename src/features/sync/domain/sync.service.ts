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

export const INITIAL_SYNC_ITEMS: SyncItem[] = [];

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
