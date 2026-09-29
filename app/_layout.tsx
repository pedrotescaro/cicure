import { Stack, usePathname } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Comfortaa_700Bold } from '@expo-google-fonts/comfortaa';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { queryClient, useStore } from '../src/data/store';
import { supabase } from '../src/data/supabase';
import { useTheme } from '../src/ui/theme';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { OnboardingModal } from '../src/features/onboarding/ui/OnboardingModal';
import { Button, Txt } from '../src/ui/components';
import { AnimatedSplash } from '../src/ui/brand/AnimatedSplash';
import AuthScreen from '../src/features/auth/AuthScreen';

// Global scope is intentional: the native splash must be retained before render on mobile.
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: false, duration: 0 });

let launchSplashFinished = false;
export default function RootLayout() {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith('/auth/');
  const { colors, isDark } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Comfortaa_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const init = useStore(s => s.init);
  const ready = useStore(s => s.ready);
  const authUserId = useStore(s => s.authUserId);
  const setAuthUser = useStore(s => s.setAuthUser);
  const clearAuthUser = useStore(s => s.clearAuthUser);
  const { preferencesReady, preferencesError, loadPreferences, onboardingVisible, markOnboardingSeen, finishOnboarding } = useStore();
  useEffect(() => { loadPreferences(); }, [loadPreferences]);
  useEffect(() => {
    if (preferencesError) void SplashScreen.hideAsync().catch(() => {});
  }, [preferencesError]);
  const [showSplash, setShowSplash] = useState(!launchSplashFinished);
  const [appLaidOut, setAppLaidOut] = useState(false);
  const [startupGraceElapsed, setStartupGraceElapsed] = useState(false);
  const [authReady, setAuthReady] = useState(!supabase);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const applyUser = (userId: string | null) => {
      if (!active) return;
      const current = useStore.getState().authUserId;
      if (userId && current !== userId) setAuthUser(userId);
      if (!userId && current) clearAuthUser();
      setAuthReady(true);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user.id ?? null);
    });
    void supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user.id ?? null))
      .catch(() => setAuthReady(true));
    return () => { active = false; subscription.unsubscribe(); };
  }, [setAuthUser, clearAuthUser]);

  useEffect(() => {
    const client = supabase;
    if (!client || Platform.OS === 'web') return;
    const refresh = (state: string) => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const subscription = AppState.addEventListener('change', refresh);
    return () => { subscription.remove(); client.auth.stopAutoRefresh(); };
  }, []);

  useEffect(() => {
    if (!authUserId) return;
    void init(`user:${authUserId}`).catch(() => {
      if (useStore.getState().authUserId === authUserId) {
        useStore.setState({ ready: true, error: 'Não foi possível iniciar o armazenamento local. Tente abrir o app novamente.' });
      }
    });
  }, [authUserId, init]);

  // Fallback timer: don't let slow font downloads or storage stall the launch screen
  useEffect(() => {
    const timer = setTimeout(() => setStartupGraceElapsed(true), 350);
    return () => clearTimeout(timer);
  }, []);

  const resourcesReady = (fontsLoaded || Boolean(fontError) || startupGraceElapsed) && authReady && (!authUserId || ready || isAuthRoute) && preferencesReady;

  const finishSplash = useCallback(() => {
    launchSplashFinished = true;
    setShowSplash(false);
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {resourcesReady ? (
            <View
              style={{ flex: 1, backgroundColor: colors.bg }}
              onLayout={() => setAppLaidOut(true)}
              accessibilityElementsHidden={showSplash}
              importantForAccessibility={showSplash ? 'no-hide-descendants' : 'auto'}
            >
              {!authUserId && !isAuthRoute ? <AuthScreen /> : authUserId && !ready && !isAuthRoute ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={colors.red} />
                  <Txt style={{ marginTop: 16 }}>Abrindo seus registros...</Txt>
                </View>
              ) : <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: colors.bg },
                }}
              />}
            </View>
          ) : !showSplash ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
              <ActivityIndicator color={colors.red} />
            </View>
          ) : null}
          {preferencesError && (
            <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
              <Txt>{preferencesError}</Txt>
              <Button title="Tentar novamente" onPress={loadPreferences} />
            </View>
          )}
          <OnboardingModal visible={Boolean(authUserId) && !isAuthRoute && preferencesReady && ready && !showSplash && onboardingVisible} onShow={markOnboardingSeen} onFinish={finishOnboarding} />
          {showSplash && preferencesReady && <AnimatedSplash ready={resourcesReady && appLaidOut} onFinish={finishSplash} />}
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
