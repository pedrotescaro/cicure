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
    userId: 'unidentified',
    userName: params.userName || 'Não identificado',
    action: params.action,
    actionLabel: params.actionLabel,
    patientName: params.patientName,
    entityKind: params.entityKind,
    entityId: params.entityId,
    metadata: params.metadata,
    createdAt: new Date().toISOString()
  };

  memoryAuditLog = [event, ...memoryAuditLog];
  return event;
}

export function getAuditEvents(): AuditEvent[] {
  return [...memoryAuditLog];
}

export const INITIAL_SESSIONS: DeviceSession[] = [];
