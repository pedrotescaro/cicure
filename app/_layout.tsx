import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Comfortaa_700Bold } from '@expo-google-fonts/comfortaa';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Platform, View } from 'react-native';
import { queryClient, useStore } from '../src/data/store';
import { colors } from '../src/ui/theme';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AnimatedSplash } from '../src/ui/brand/AnimatedSplash';

// Global scope is intentional: the native splash must be retained before render.
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: false, duration: 0 });

let launchSplashFinished = false;
let initialStoreLoad: Promise<void> | undefined;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Comfortaa_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const init = useStore(s => s.init); const ready = useStore(s => s.ready);
  const [showSplash, setShowSplash] = useState(!launchSplashFinished);
  const [appLaidOut, setAppLaidOut] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const resourcesReady = (fontsLoaded || Boolean(fontError)) && ready;
  const finishSplash = useCallback(() => {
    launchSplashFinished = true;
    setShowSplash(false);
  }, []);

  useEffect(() => {
    if (resourcesReady) setBootstrapped(true);
  }, [resourcesReady]);

  useEffect(() => {
    initialStoreLoad ??= init().catch(() => {
      // The store already handles SQLite failures; retain a visible error if an
      // unexpected initialization failure escapes, rather than trapping launch.
      useStore.setState({ ready: true, error: 'Não foi possível iniciar o armazenamento local. Tente abrir o app novamente.' });
    });
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'cicura-web-focus-reset';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          input:focus, textarea:focus, select:focus, input:focus-visible, textarea:focus-visible, select:focus-visible {
            outline: none !important;
            box-shadow: none !important;
          }
          input, textarea, select {
            outline: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, [init]);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {(bootstrapped || resourcesReady) ? (
            <View
              style={{ flex: 1 }}
              onLayout={() => setAppLaidOut(true)}
              accessibilityElementsHidden={showSplash}
              importantForAccessibility={showSplash ? 'no-hide-descendants' : 'auto'}
            >
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
            </View>
          ) : !showSplash ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.red} />
            </View>
          ) : null}
          {showSplash && <AnimatedSplash ready={resourcesReady && appLaidOut} onFinish={finishSplash} />}
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
