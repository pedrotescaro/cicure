import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import type { AuditAction, AuditEvent, DeviceSession, SecuritySettings } from './types';
import { uid } from '../../../data/store';

// Eventos registrados nesta sessão.
let memoryAuditLog: AuditEvent[] = [];

export async function checkBiometricsAvailable(): Promise<{
  hasHardware: boolean;
  isEnrolled: boolean;
  biometryType: string;
}> {
  if (Platform.OS === 'web') {
    return { hasHardware: false, isEnrolled: false, biometryType: 'Nenhum' };
  }
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
  
  let biometryType = 'Biometria';
  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    biometryType = 'Reconhecimento Facial (Face ID)';
  } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    biometryType = 'Impressão Digital (Touch ID / Fingerprint)';
  }

  return { hasHardware, isEnrolled, biometryType };
}

export async function authenticateLocal(promptMessage = 'Autentique para acessar o Cicure'): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar PIN do aplicativo',
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}

export function logAuditEvent(params: {
  action: AuditAction;
  actionLabel: string;
  userName?: string;
  patientName?: string;
  entityKind?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}): AuditEvent {
  const event: AuditEvent = {
    id: uid(),
    userId: 'current-user',
    userName: params.userName || 'Caroline Ferreira',
    action: params.action,
    actionLabel: params.actionLabel,
    patientName: params.patientName,
    entityKind: params.entityKind,
    entityId: params.entityId,
    metadata: params.metadata,
    ipAddress: '127.0.0.1',
    createdAt: new Date().toISOString()
  };

  memoryAuditLog = [event, ...memoryAuditLog];
  return event;
}

export function getAuditEvents(): AuditEvent[] {
  return [...memoryAuditLog];
}

export const INITIAL_SESSIONS: DeviceSession[] = [
  {
    id: 'sess-current',
    deviceId: 'dev-001',
    deviceName: Platform.OS === 'ios' ? 'iPhone 15 Pro' : Platform.OS === 'android' ? 'Samsung Galaxy S24' : 'Google Chrome (Web)',
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    ipAddress: '192.168.1.102 (São Paulo, Brasil)',
    lastActive: 'Agora',
    isCurrent: true,
    revoked: false
  },
  {
    id: 'sess-ipad',
    deviceId: 'dev-002',
    deviceName: 'iPad Air 5ª Geração (Clínica)',
    platform: 'ios',
    ipAddress: '177.18.42.10 (São Paulo, Brasil)',
    lastActive: 'Há 3 horas',
    isCurrent: false,
    revoked: false
  },
  {
    id: 'sess-notebook',
    deviceId: 'dev-003',
    deviceName: 'MacBook Air M2 (Consultório)',
    platform: 'web',
    ipAddress: '177.18.42.10 (São Paulo, Brasil)',
    lastActive: 'Ontem às 18:30',
    isCurrent: false,
    revoked: false
  }
];
