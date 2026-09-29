import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { authErrorMessage, authRedirect, completeAuthCallback } from '../../src/features/auth/auth';
import { Button, Txt } from '../../src/ui/components';
import { useTheme } from '../../src/ui/theme';

export default function AuthCallback() {
  const router = useRouter();
  const { code, error: callbackError, error_description } = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const { colors } = useTheme();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const finish = async () => {
      try {
        if (callbackError) throw new Error(error_description || callbackError);
        if (!code) throw new Error('O link de acesso está incompleto. Solicite um novo link.');
        await completeAuthCallback(`${authRedirect('callback')}?code=${encodeURIComponent(code)}`);
        if (active) router.replace('/');
      } catch (cause) {
        if (active) setError(authErrorMessage(cause));
      }
    };
    void finish();
    return () => { active = false; };
  }, [callbackError, code, error_description, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      {error ? <>
        <Txt accessibilityRole="alert" style={{ fontSize: 17, textAlign: 'center' }}>{error}</Txt>
        <Button title="Voltar para entrar" onPress={() => router.replace('/')} />
      </> : <>
        <ActivityIndicator size="large" color={colors.red} />
        <Txt style={{ fontSize: 17 }}>Concluindo seu acesso...</Txt>
      </>}
    </View>
  );
}
