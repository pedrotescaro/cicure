export type SyncItemStatus = 
  | 'sincronizado' 
  | 'aguardando' 
  | 'enviando' 
  | 'erro' 
  | 'conflito';

export type SyncItem = {
  id: string;
  idempotencyKey: string;
  entityKind: string;
  entityId: string;
  title: string;
  status: SyncItemStatus;
  version: number;
  attempts: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  localData?: any;
  remoteData?: any;
};

export type ConflictResolution = {
  syncItemId: string;
  resolutionType: 'use_local' | 'use_remote' | 'reconciled';
  reconciledPayload?: any;
  resolvedAt: string;
  resolvedBy: string;
};
