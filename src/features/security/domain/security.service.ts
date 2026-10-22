import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import type { DeviceSession } from './types';





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
    biometryType = 'Reconhecimento facial';
  } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    biometryType = 'Impressão digital';
  }

  return { hasHardware, isEnrolled, biometryType };
}

export async function authenticateLocal(promptMessage = 'Autentique para acessar o Cicure'): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar bloqueio do aparelho',
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}

export const INITIAL_SESSIONS: DeviceSession[] = [];
