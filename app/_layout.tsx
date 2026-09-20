import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Comfortaa_700Bold } from '@expo-google-fonts/comfortaa';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Platform, View } from 'react-native';
import { queryClient, useStore } from '../src/data/store';
import { useTheme } from '../src/ui/theme';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AnimatedSplash } from '../src/ui/brand/AnimatedSplash';

// Global scope is intentional: the native splash must be retained before render on mobile.
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ fade: false, duration: 0 });

let launchSplashFinished = false;
let initialStoreLoad: Promise<void> | undefined;

export default function RootLayout() {
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
  const [showSplash, setShowSplash] = useState(!launchSplashFinished);
  const [appLaidOut, setAppLaidOut] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [startupGraceElapsed, setStartupGraceElapsed] = useState(false);

  // Fallback timer: don't let slow font downloads or storage stall the launch screen
  useEffect(() => {
    const timer = setTimeout(() => setStartupGraceElapsed(true), 350);
    return () => clearTimeout(timer);
  }, []);

  const resourcesReady = (fontsLoaded || Boolean(fontError) || startupGraceElapsed) && (ready || startupGraceElapsed);

  const finishSplash = useCallback(() => {
    launchSplashFinished = true;
    setShowSplash(false);
  }, []);

  useEffect(() => {
    if (resourcesReady) setBootstrapped(true);
  }, [resourcesReady]);

  useEffect(() => {
    initialStoreLoad ??= init().catch(() => {
      useStore.setState({ ready: true, error: 'Não foi possível iniciar o armazenamento local. Tente abrir o app novamente.' });
    });

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'cicure-web-focus-reset';
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
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {(bootstrapped || resourcesReady) ? (
            <View
              style={{ flex: 1, backgroundColor: colors.bg }}
              onLayout={() => setAppLaidOut(true)}
              accessibilityElementsHidden={showSplash}
              importantForAccessibility={showSplash ? 'no-hide-descendants' : 'auto'}
            >
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'fade',
                  contentStyle: { backgroundColor: colors.bg },
                }}
              />
            </View>
          ) : !showSplash ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
              <ActivityIndicator color={colors.red} />
            </View>
          ) : null}
          {showSplash && <AnimatedSplash ready={resourcesReady && appLaidOut} onFinish={finishSplash} />}
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
