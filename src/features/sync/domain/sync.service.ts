import type { SyncItem, ConflictResolution } from './types';

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
  void resolution; void items;
  throw new Error('Compare as versões na tela Envio de dados. A resolução precisa ser persistida e confirmada pelo servidor.');
}
