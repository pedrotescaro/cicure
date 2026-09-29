import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cloudConfigured } from '../../data/supabase';
import { fonts, useTheme } from '../../ui/theme';
import { Txt } from '../../ui/components';
import { authErrorMessage, sendPasswordRecovery, signInWithEmail, signInWithGoogle, signUpWithEmail } from './auth';

type Mode = 'login' | 'signup' | 'recovery';

export default function AuthScreen() {
  const { colors: c } = useTheme();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const submit = async () => {
    setError('');
    setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Informe seu nome para criar a conta.');
      return;
    }
    if (mode !== 'recovery' && password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await signInWithEmail(email, password);
      if (mode === 'signup') {
        const active = await signUpWithEmail(email, password, name);
        if (!active) setNotice('Enviamos um link de confirmação. Abra seu e-mail para ativar a conta.');
      }
      if (mode === 'recovery') {
        await sendPasswordRecovery(email);
        setNotice('Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.');
      }
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    setBusy(true);
    try { await signInWithGoogle(); }
    catch (cause) { setError(authErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  const inputStyle = {
    minHeight: 54, borderWidth: 1, borderColor: c.border, borderRadius: 14,
    paddingHorizontal: 16, fontSize: 17, color: c.text, backgroundColor: c.surface,
  } as const;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: 24 }}>
          <View style={{ gap: 10 }}>
            <Txt style={{ fontFamily: fonts.brand, fontSize: 34, color: c.red }}>cicure</Txt>
            <Txt accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 27, lineHeight: 34 }}>
              {mode === 'login' ? 'Entre na sua conta' : mode === 'signup' ? 'Crie sua conta' : 'Recupere sua senha'}
            </Txt>
            <Txt muted style={{ fontSize: 16, lineHeight: 23 }}>
              {mode === 'recovery' ? 'Enviaremos um link para o seu e-mail.' : 'Seus registros ficam vinculados à sua conta.'}
            </Txt>
          </View>

          {!cloudConfigured ? (
            <View style={{ padding: 18, borderRadius: 14, backgroundColor: c.redSoft }}>
              <Txt style={{ fontSize: 16, lineHeight: 23 }}>A conexão do aplicativo ainda não foi configurada. Procure o responsável pela instalação.</Txt>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {mode === 'signup' && (
                <View style={{ gap: 7 }}>
                  <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Nome completo</Txt>
                  <TextInput accessibilityLabel="Nome completo" value={name} onChangeText={setName} autoComplete="name" style={inputStyle} placeholder="Seu nome" placeholderTextColor={c.secondary} />
                </View>
              )}
              <View style={{ gap: 7 }}>
                <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>E-mail</Txt>
                <TextInput accessibilityLabel="E-mail" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" autoCapitalize="none" style={inputStyle} placeholder="nome@exemplo.com" placeholderTextColor={c.secondary} />
              </View>
              {mode !== 'recovery' && (
                <View style={{ gap: 7 }}>
                  <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Senha</Txt>
                  <View style={{ position: 'relative' }}>
                    <TextInput accessibilityLabel="Senha" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} style={[inputStyle, { paddingRight: 64 }]} placeholder="Pelo menos 8 caracteres" placeholderTextColor={c.secondary} />
                    <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: 2, top: 1, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                      {showPassword ? <EyeOff size={22} color={c.secondary} /> : <Eye size={22} color={c.secondary} />}
                    </Pressable>
                  </View>
                </View>
              )}
              {mode === 'signup' && (
                <View style={{ gap: 7 }}>
                  <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Confirme a senha</Txt>
                  <TextInput accessibilityLabel="Confirme a senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} autoComplete="new-password" style={inputStyle} placeholder="Digite a senha novamente" placeholderTextColor={c.secondary} />
                </View>
              )}

              {!!error && <Txt accessibilityRole="alert" style={{ color: c.red, fontSize: 15, lineHeight: 21 }}>{error}</Txt>}
              {!!notice && <Txt accessibilityRole="alert" style={{ color: c.green, fontSize: 15, lineHeight: 21 }}>{notice}</Txt>}

              <Pressable accessibilityRole="button" accessibilityLabel={mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link de recuperação'} disabled={busy} onPress={() => void submit()} style={({ pressed }) => ({ minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.red, opacity: busy ? 0.5 : pressed ? 0.85 : 1 })}>
                {busy ? <ActivityIndicator color="#fff" /> : <Txt style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 17 }}>{mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Criar conta' : 'Enviar link'}</Txt>}
              </Pressable>

              {mode === 'login' && (
                <>
                  <Pressable accessibilityRole="button" disabled={busy} onPress={() => void google()} style={({ pressed }) => ({ minHeight: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 })}>
                    <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>Continuar com Google</Txt>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => switchMode('recovery')} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ fontFamily: fonts.semibold, color: c.red, fontSize: 16 }}>Esqueci minha senha</Txt>
                  </Pressable>
                </>
              )}
              <Pressable accessibilityRole="button" onPress={() => switchMode(mode === 'login' ? 'signup' : 'login')} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ fontSize: 16, color: c.red, fontFamily: fonts.semibold }}>{mode === 'login' ? 'Criar uma conta' : 'Voltar para entrar'}</Txt>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
