import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { Empty, IconButton, Txt, safeBack } from '../../../ui/components';
import { fonts, useTheme } from '../../../ui/theme';
import { useStore } from '../../../data/store';

export function SupportPage({ title, subtitle, backTo = '/more', children }: { title: string; subtitle?: string; backTo?: string; children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();
  const presentation = useStore(s => s.presentation);
  if (presentation) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.bg }}><Empty title="Modo apresentação" description="Saia do modo apresentação para abrir os registros da sua conta." action="Voltar" onPress={() => safeBack(router, '/more')} /></View>;
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom + 48, paddingHorizontal: 20 }}>
      <View style={supportStyles.content}>
        <IconButton icon={ArrowLeft} label="Voltar" onPress={() => safeBack(router, backTo)} />
        <View style={{ gap: 8 }}><Txt accessibilityRole="header" style={supportStyles.title}>{title}</Txt>{!!subtitle && <Txt muted style={supportStyles.body}>{subtitle}</Txt>}</View>
        {children}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

export function SupportMessage({ children, error = false }: { children: ReactNode; error?: boolean }) {
  const { colors: c } = useTheme();
  return children ? <Txt accessibilityRole="alert" style={[supportStyles.body, { color: error ? c.red : c.green }]}>{children}</Txt> : null;
}

export const supportStyles = StyleSheet.create({
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 20 },
  title: { fontFamily: fonts.brand, fontSize: 27, lineHeight: 36 },
  heading: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 27 },
  body: { fontSize: 16, lineHeight: 24 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  section: { gap: 14 },
});
