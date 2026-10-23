import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { LayoutRectangle } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { CalendarDays, ClipboardList, FileText, House, Menu } from 'lucide-react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import { fonts, useTheme } from '../theme';
import { getGlassColors, liquidMotion, navigationMetrics as metrics, tabBarBottom } from '../motion';
import { useMotionPreferences } from '../useMotionPreferences';

const tabItems = {
  index: { label: 'Início', Icon: House },
  patients: { label: 'Pacientes', Icon: ClipboardList },
  care: { label: 'Agenda', Icon: CalendarDays },
  reports: { label: 'Relatórios', Icon: FileText },
  more: { label: 'Menu', Icon: Menu },
} as const;

type Props = BottomTabBarProps & { blurTarget: RefObject<View | null> };
type MeasuredItem = LayoutRectangle & { barWidth: number };

/** Keep the elastic lens inside the capsule when a spring overshoots or reverses. */
export function liquidLensGeometry(left: number, right: number, base: number, inflation: number, barWidth: number, barHeight: number) {
  'worklet';
  const pulse = Math.max(0, Math.min(1, inflation));
  const width = Math.min(barWidth - 4, Math.max(base * 0.94, Math.min(Math.abs(right - left) + pulse * base * 0.16, base * liquidMotion.maxStretch)));
  const stretch = Math.max(0, Math.min(1, (width / base - 1) / (liquidMotion.maxStretch - 1)));
  const height = Math.min(barHeight - 4, metrics.lensHeight + pulse * liquidMotion.inflation - stretch * liquidMotion.squash);
  const x = Math.max(2, Math.min(barWidth - width - 2, (left + right) / 2 - width / 2));
  const y = Math.max(2, Math.min(barHeight - height - 2, metrics.lensCenterY - height / 2));
  return { width, height, x, y, stretch };
}

export function LiquidTabBar({ state, navigation, descriptors, insets, blurTarget }: Props) {
  const { isDark } = useTheme();
  const glassColors = getGlassColors(isDark);
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const barHeight = metrics.height + Math.max(0, fontScale - 1) * 52;
  const { reduceMotion, reduceTransparency } = useMotionPreferences();
  const [layouts, setLayouts] = useState<Record<string, MeasuredItem>>({});
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const activeKey = state.routes[state.index].key;
  const selectedLayout = layouts[activeKey];
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const restingWidth = useSharedValue<number>(metrics.lensWidth);
  const visible = useSharedValue(0);
  const inflation = useSharedValue(0);
  const barWidth = Math.min(screenWidth - metrics.sideMargin * 2 - insets.left - insets.right, metrics.maxWidth);
  const previousWidth = useRef(barWidth);
  const barLeft = insets.left + (screenWidth - insets.left - insets.right - barWidth) / 2;
  const supportsBlur = !reduceTransparency && (Platform.OS !== 'android' || Number(Platform.Version) >= 31);

  const moveLens = useCallback((x: number, itemWidth: number, immediate: boolean) => {
    'worklet';
    const lensWidth = Math.min(metrics.lensWidth, itemWidth - 10);
    const center = x + itemWidth / 2;
    const targetLeft = center - lensWidth / 2;
    const targetRight = center + lensWidth / 2;
    const movingRight = center >= (left.get() + right.get()) / 2;
    cancelAnimation(left);
    cancelAnimation(right);
    cancelAnimation(inflation);
    restingWidth.set(lensWidth);
    if (immediate || visible.get() === 0) {
      left.set(targetLeft);
      right.set(targetRight);
      inflation.set(0);
    } else {
      left.set(movingRight
        ? withDelay(liquidMotion.trailingDelay, withSpring(targetLeft, liquidMotion.trailing))
        : withSpring(targetLeft, liquidMotion.leading));
      right.set(movingRight
        ? withSpring(targetRight, liquidMotion.leading)
        : withDelay(liquidMotion.trailingDelay, withSpring(targetRight, liquidMotion.trailing)));
      inflation.set(withSequence(
        withTiming(1, { duration: liquidMotion.inflateDuration }),
        withSpring(0, liquidMotion.inflationSpring),
      ));
    }
    visible.set(1);
  }, [left, right, restingWidth, visible, inflation]);

  useEffect(() => {
    const resized = previousWidth.current !== barWidth;
    if (selectedLayout?.barWidth === barWidth) {
      previousWidth.current = barWidth;
      scheduleOnUI(moveLens, selectedLayout.x, selectedLayout.width, reduceMotion || resized);
    }
  }, [moveLens, selectedLayout, reduceMotion, barWidth]);

  const lensStyle = useAnimatedStyle(() => {
    const { width, height, x, y, stretch } = liquidLensGeometry(left.get(), right.get(), restingWidth.get(), inflation.get(), barWidth, barHeight);
    return {
      width,
      height,
      borderRadius: height / 2,
      opacity: visible.get() * (1 - stretch * 0.22),
      transform: [
        { translateX: x },
        { translateY: y },
      ],
    };
  });

  return (
    <View
      testID="liquid-tab-bar"
      style={[
        styles.position,
        {
          width: barWidth,
          height: barHeight,
          left: barLeft,
          bottom: tabBarBottom(insets.bottom),
          shadowColor: glassColors.shadow,
        },
      ]}
    >
      <View pointerEvents="none" style={[styles.capsule, { borderColor: glassColors.outline }]}>
        {supportsBlur && (
          <BlurView
            pointerEvents="none"
            blurTarget={blurTarget}
            blurMethod="dimezisBlurViewSdk31Plus"
            intensity={24}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: supportsBlur ? glassColors.wash : glassColors.fallback },
          ]}
        />
      </View>
      <View style={styles.items}>
        <View pointerEvents="none" style={styles.lensClip}>
        <Animated.View
          testID="liquid-tab-lens"
          pointerEvents="none"
          style={[
            styles.lens,
            { backgroundColor: glassColors.lens, borderColor: glassColors.edge },
            lensStyle,
          ]}
        >
          <Svg accessible={false} viewBox="0 0 100 20" preserveAspectRatio="none" style={styles.reflection}>
            <Path d="M4 16 C25 1 75 1 96 16" fill="none" stroke={glassColors.reflection} strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </Svg>
          <Svg accessible={false} viewBox="0 0 100 20" preserveAspectRatio="none" style={styles.lowerReflection}>
            <Path d="M8 4 C30 17 70 17 92 4" fill="none" stroke={glassColors.lowerReflection} strokeWidth={1} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </Svg>
        </Animated.View>
        </View>
        {state.routes.map(route => {
          const item = tabItems[route.name as keyof typeof tabItems];
          if (!item) return null;
          const { label, Icon } = item;
          const active = route.key === activeKey;
          const options = descriptors[route.key].options;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="tab"
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityState={{ selected: active }}
              aria-selected={active}
              onLayout={({ nativeEvent: { layout } }) =>
                setLayouts(current => {
                  const previous = current[route.key];
                  return previous?.x === layout.x && previous?.width === layout.width && previous?.barWidth === barWidth
                    ? current
                    : { ...current, [route.key]: { ...layout, barWidth } };
                })
              }
              onFocus={event => {
                const target = event.currentTarget as unknown as { matches?: (selector: string) => boolean };
                if (Platform.OS === 'web' && target.matches?.(':focus-visible')) setFocusedKey(route.key);
              }}
              onBlur={() => setFocusedKey(null)}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [
                styles.tab,
                { height: barHeight - 2 },
                pressed && { opacity: 0.8 },
                focusedKey === route.key && { borderColor: glassColors.active },
              ]}
            >
              <View style={styles.icon}>
                <Icon size={22} color={active ? glassColors.active : glassColors.inactive} strokeWidth={active ? 2.3 : 1.8} />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: active ? glassColors.active : glassColors.inactive },
                  screenWidth < 380 && { fontSize: 11 },
                  active && styles.activeLabel,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
    height: metrics.height,
    borderRadius: metrics.height / 2,
    zIndex: 5,
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  capsule: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: metrics.height / 2,
    borderWidth: 1,
  },
  items: { flex: 1, flexDirection: 'row', paddingHorizontal: metrics.padding },
  lensClip: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderRadius: metrics.height / 2 },
  lens: { position: 'absolute', left: 0, top: 0, overflow: 'hidden', borderWidth: 1 },
  reflection: {
    position: 'absolute',
    top: 1,
    left: '13%',
    right: '13%',
    height: 9,
  },
  lowerReflection: {
    position: 'absolute',
    bottom: 1,
    left: '22%',
    right: '22%',
    height: 6,
  },
  tab: {
    flex: 1,
    minWidth: 48,
    height: metrics.height - 2,
    alignItems: 'center',
    paddingTop: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 26,
  },
  icon: { height: 28, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.medium, fontSize: 12, marginTop: 4, textAlign: 'center' },
  activeLabel: { fontFamily: fonts.semibold },
});
