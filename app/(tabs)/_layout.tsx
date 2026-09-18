import { Tabs, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ClipboardList, FileText, House, Menu, Plus, Stethoscope } from 'lucide-react-native';
import { colors, fonts } from '../../src/ui/theme';
import { useStore } from '../../src/data/store';

const tabs = [
  { name: 'index', route: '/', label: 'Início', Icon: House },
  { name: 'patients', route: '/patients', label: 'Pacientes', Icon: ClipboardList },
  { name: 'care', route: '/care', label: 'Atendimento', Icon: Stethoscope },
  { name: 'reports', route: '/reports', label: 'Relatórios', Icon: FileText },
  { name: 'more', route: '/more', label: 'Mais', Icon: Menu },
];

function FloatingTabBar() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const presentation = useStore(s => s.presentation);
  const barWidth = Math.min(width - 24, 520);
  const barLeft = Math.max(12, (width - barWidth) / 2);
  const tabWidth = barWidth / tabs.length;
  const bubbleSize = Math.min(50, Math.max(42, tabWidth - 12));
  const activeIndex = Math.max(0, tabs.findIndex(tab => pathname === tab.route || (tab.name === 'patients' && pathname.startsWith('/patient'))));
  const bubbleX = activeIndex * tabWidth + (tabWidth - bubbleSize) / 2;
  const bubblePosition = useRef(new Animated.Value(bubbleX)).current;
  const labelSize = width < 350 ? 8 : width < 400 ? 9 : 10;
  useEffect(() => { Animated.spring(bubblePosition, { toValue: bubbleX, damping: 18, stiffness: 190, mass: .75, useNativeDriver: true }).start(); }, [bubblePosition, bubbleX]);
  return <View style={[styles.tabbar, { width: barWidth, left: barLeft, bottom: Math.max(insets.bottom, 12) }]}>
    <Animated.View pointerEvents="none" style={[styles.bubble, { width: bubbleSize, height: bubbleSize, borderRadius: bubbleSize / 2, transform: [{ translateX: bubblePosition }] }]}><BlurView intensity={38} tint="light" style={StyleSheet.absoluteFill} /><View style={styles.bubbleTint} /></Animated.View>
    {tabs.map(({ name, route, label, Icon }) => { const active = pathname === route || (name === 'patients' && pathname.startsWith('/patient')); return <Pressable key={name} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }} onPress={() => router.push(route as never)} style={styles.tab}>
      <View style={styles.tabIcon}><Icon size={21} color={active ? colors.text : colors.tertiary} strokeWidth={active ? 2.05 : 1.6} /></View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.78} style={[styles.tabLabel, { maxWidth: tabWidth - 6, fontSize: labelSize }, active && { color: colors.text, fontFamily: fonts.semibold }]}>{label}</Text>
    </Pressable>; })}
  </View>;
}

export default function TabsLayout() { const { width } = useWindowDimensions(); const insets = useSafeAreaInsets(); const router = useRouter(); const presentation = useStore(s => s.presentation); const barWidth = Math.min(width - 24, 520); const barLeft = Math.max(12, (width - barWidth) / 2); return <>
  <Tabs tabBar={() => <FloatingTabBar />} screenOptions={{ headerShown: false }}>
    <Tabs.Screen name="index" /><Tabs.Screen name="patients" /><Tabs.Screen name="care" /><Tabs.Screen name="reports" /><Tabs.Screen name="more" />
  </Tabs>
  {!presentation && <Pressable accessibilityRole="button" accessibilityLabel="Novo atendimento" onPress={() => router.push('/care/new')} style={[styles.fab, { right: barLeft + 16, bottom: Math.max(insets.bottom, 12) + 78 }]}><Plus size={24} color="#FFF" strokeWidth={2.3} /></Pressable>}
</>; }

const styles = StyleSheet.create({
  tabbar: { position: 'absolute', height: 72, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(20,20,20,0.12)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, zIndex: 5, shadowColor: '#000', shadowOpacity: .1, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 7 },
  bubble: { position: 'absolute', top: 6, left: 0, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(214,40,40,0.32)', shadowColor: '#D62828', shadowOpacity: .15, shadowRadius: 13, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  bubbleTint: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(255,255,255,0.28)' },
  tab: { flex: 1, minWidth: 0, minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 1, zIndex: 1 },
  tabIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { color: colors.tertiary, fontFamily: fonts.medium, textAlign: 'center', includeFontPadding: false },
  fab: { position: 'absolute', zIndex: 7, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: .18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
});
