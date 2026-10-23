import { Tabs, usePathname, useRouter } from 'expo-router';
import { createRef, useCallback, useRef, type RefObject } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurTargetView } from 'expo-blur';
import { Plus } from 'lucide-react-native';
import { fonts, useTheme } from '../../src/ui/theme';
import { Txt } from '../../src/ui/components';
import { useStore } from '../../src/data/store';
import { LiquidTabBar } from '../../src/ui/navigation/LiquidTabBar';
import { navigationMetrics as metrics, tabBarBottom } from '../../src/ui/motion';

export default function TabsLayout() {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { colors, isDark } = useTheme();
  const presentation = useStore(s => s.presentation);
  const targets = useRef<Record<string, RefObject<View | null>>>({});
  const getBlurTarget = useCallback((key: string) => {
    targets.current[key] ??= createRef<View>();
    return targets.current[key];
  }, []);
  const barWidth = Math.min(width - metrics.sideMargin * 2 - insets.left - insets.right, metrics.maxWidth);
  const barRight = insets.right + (width - insets.left - insets.right - barWidth) / 2;

  return (
    <>
      <Tabs
        tabBar={props => <LiquidTabBar {...props} blurTarget={getBlurTarget(props.state.routes[props.state.index].key)} />}
        screenLayout={({ children, route }) => (
          <BlurTargetView ref={getBlurTarget(route.key)} style={[styles.scene, { backgroundColor: colors.bg }]}>
            <View style={styles.responsiveScene}>
              {children}
            </View>
          </BlurTargetView>
        )}
        screenOptions={{
          headerShown: false,
          animation: 'none',
          tabBarStyle: { position: 'absolute' },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="patients" />
        <Tabs.Screen name="care" />
        <Tabs.Screen name="reports" />
        <Tabs.Screen name="more" />
      </Tabs>
      {!presentation && pathname !== '/' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Novo atendimento"
          onPress={() => router.push('/care/new')}
          style={({ pressed }) => [
            styles.fab,
            {
              right: barRight + 16,
              bottom: tabBarBottom(insets.bottom) + metrics.height + metrics.fabGap + Math.max(0, fontScale - 1) * 52,
              backgroundColor: pressed ? colors.redPressed : colors.red,
              shadowColor: isDark ? '#000000' : colors.dark,
            },
          ]}
        >
          <Plus size={24} color="#FFFFFF" strokeWidth={2.4} />
          <Txt style={{ color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 16, flexShrink: 1, textAlign: 'center' }}>Novo atendimento</Txt>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1 },
  responsiveScene: {
    flex: 1,
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
  },
  fab: {
    position: 'absolute',
    zIndex: 7,
    minHeight: metrics.fabSize,
    maxWidth: '90%',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
