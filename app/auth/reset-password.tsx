import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { authErrorMessage, authRedirect, completeAuthCallback, updatePassword } from '../../src/features/auth/auth';
import { Txt } from '../../src/ui/components';
import { fonts, useTheme } from '../../src/ui/theme';

export default function ResetPassword() {
  const router = useRouter();
  const { code, error: callbackError, error_description } = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const { colors: c } = useTheme();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const open = async () => {
      try {
        if (callbackError) throw new Error(error_description || callbackError);
        if (!code) throw new Error('O link expirou ou está incompleto. Solicite outro link.');
        await completeAuthCallback(`${authRedirect('reset-password')}?code=${encodeURIComponent(code)}`);
        if (active) setReady(true);
      } catch (cause) {
        if (active) setError(authErrorMessage(cause));
      }
    };
    void open();
    return () => { active = false; };
  }, [callbackError, code, error_description]);

  const submit = async () => {
    setError('');
    if (password.length < 8) { setError('Use pelo menos 8 caracteres.'); return; }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      await updatePassword(password);
      router.replace('/');
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24 }}>
      <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16 }}>
        <Txt accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 27 }}>Crie uma nova senha</Txt>
        {!ready && !error && <ActivityIndicator color={c.red} />}
        {!!error && <Txt accessibilityRole="alert" style={{ color: c.red, fontSize: 16 }}>{error}</Txt>}
        {ready && <>
          <Txt style={{ fontSize: 16 }}>Nova senha</Txt>
          <TextInput accessibilityLabel="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" style={{ minHeight: 54, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16, color: c.text, fontSize: 17 }} />
          <Txt style={{ fontSize: 16 }}>Confirme a nova senha</Txt>
          <TextInput accessibilityLabel="Confirme a nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" style={{ minHeight: 54, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 16, color: c.text, fontSize: 17 }} />
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={{ minHeight: 54, borderRadius: 14, backgroundColor: c.red, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Txt style={{ fontFamily: fonts.semibold, color: '#fff', fontSize: 17 }}>Salvar nova senha</Txt>}
          </Pressable>
        </>}
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ color: c.red, fontFamily: fonts.semibold, fontSize: 16 }}>Voltar</Txt>
        </Pressable>
      </View>
    </View>
  );
}
