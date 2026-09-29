import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../data/supabase';

function client() {
  if (!supabase) throw new Error('A conexão do aplicativo ainda não foi configurada.');
  return supabase;
}

export function authRedirect(path: 'callback' | 'reset-password') {
  const route = `/auth/${path}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${route}`;
  }
  return Linking.createURL(route);
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  const { data, error } = await client().auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: authRedirect('callback'), data: { full_name: name.trim() } },
  });
  if (error) throw error;
  return data.session !== null;
}

export async function sendPasswordRecovery(email: string) {
  const { error } = await client().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirect('reset-password'),
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await client().auth.updateUser({ password });
  if (error) throw error;
}

export async function signInWithGoogle() {
  const redirectTo = authRedirect('callback');
  const { data, error } = await client().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) throw error;
  if (Platform.OS !== 'web' && data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') await completeAuthCallback(result.url);
  }
}

let pendingCode: string | null = null;
let pendingExchange: Promise<void> | null = null;
let completedCode: string | null = null;

export async function completeAuthCallback(url: string) {
  const parsed = new URL(url);
  const error = parsed.searchParams.get('error_description') || parsed.searchParams.get('error');
  if (error) throw new Error(error);
  const code = parsed.searchParams.get('code');
  if (!code) throw new Error('O link de acesso não contém um código válido. Tente novamente.');
  if (completedCode === code) return;
  if (pendingCode === code && pendingExchange) return pendingExchange;
  pendingCode = code;
  pendingExchange = client().auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
    if (exchangeError) throw exchangeError;
    completedCode = code;
  });
  try { await pendingExchange; }
  finally { pendingCode = null; pendingExchange = null; }
}

export async function signOut() {
  const { error } = await client().auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail pelo link enviado antes de entrar.';
  if (/user already registered/i.test(message)) return 'Este e-mail já possui conta. Entre ou recupere sua senha.';
  if (/password should be at least/i.test(message)) return 'Use uma senha com pelo menos 8 caracteres.';
  if (/provider is not enabled|unsupported provider/i.test(message)) return 'O acesso com Google ainda precisa ser habilitado no projeto.';
  if (/network|fetch failed/i.test(message)) return 'Sem conexão com o serviço. Verifique a internet e tente novamente.';
  return message;
}
