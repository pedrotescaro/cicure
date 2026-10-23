import { createContext, useContext, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AuthScreen from '../../features/auth/AuthScreen';
import { useStore } from '../../data/store';
import { Button, Txt } from '../components';
import { useTheme } from '../theme';
import { rootScreenMode, type RootScreenState } from './root-screen-state';

export const RootScreenAccess = createContext<Omit<RootScreenState, 'isAuthRoute'> | null>(null);

/** Keep the navigator mounted while withholding private screen components until access is ready. */
export function RootScreenGate({ children, isAuthRoute }: { children: ReactNode; isAuthRoute: boolean }) {
  const access = useContext(RootScreenAccess);
  const { colors } = useTheme();
  if (!access) throw new Error('Root screen access provider is missing.');
  const mode = rootScreenMode({ ...access, isAuthRoute });
  if (mode === 'content') return children;
  if (mode === 'login') return <AuthScreen />;
  if (mode === 'clinic-blocked') return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 20 }}>
    <Txt style={{ fontSize: 24 }}>Confirme seu acesso à clínica</Txt>
    <Txt>{access.storageError || 'Conecte-se à internet para abrir registros compartilhados. Os rascunhos da clínica continuam guardados neste aparelho.'}</Txt>
    <Button title="Tentar acessar novamente" onPress={() => void useStore.getState().init()} />
    <Button title="Abrir meus atendimentos individuais" variant="outline" onPress={() => void useStore.getState().setWorkMode('individual')} />
  </View>;
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator color={colors.red} />
    <Txt style={{ marginTop: 16 }}>Abrindo seus registros...</Txt>
  </View>;
}
