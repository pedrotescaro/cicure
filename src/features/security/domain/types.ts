export type DeviceSession = {
  id: string;
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
  revoked: boolean;
};

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'prontuario_view'
  | 'record_create'
  | 'record_edit'
  | 'record_sign'
  | 'doc_export'
  | 'doc_share'
  | 'conflict_resolve'
  | 'app_unlocked';

export type AuditEvent = {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  actionLabel: string;
  entityKind?: string;
  entityId?: string;
  patientName?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
};

export type SecuritySettings = {
  biometricsEnabled: boolean;
  pinCode?: string;
  autoLockMinutes: number; // 0 = imediatamente, 1, 5, 15
  requireMfa: boolean;
};
