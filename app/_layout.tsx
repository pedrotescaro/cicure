import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Comfortaa_700Bold } from '@expo-google-fonts/comfortaa';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { queryClient, useStore } from '../src/data/store';
import { colors } from '../src/ui/theme';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Comfortaa_700Bold, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const init = useStore(s => s.init); const ready = useStore(s => s.ready);
  useEffect(() => { void init(); }, [init]);
  if (!fontsLoaded || !ready) return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.red} /></View>;
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, animation: 'fade' }} /></QueryClientProvider></SafeAreaProvider>;
}
