import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { LayoutRectangle } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { BlurView } from 'expo-blur';
import { ClipboardList, FileText, House, Menu, Stethoscope } from 'lucide-react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import { fonts, useTheme } from '../theme';
import { getGlassColors, liquidMotion, navigationMetrics as metrics, tabBarBottom } from '../motion';
import { useMotionPreferences } from '../useMotionPreferences';

const tabItems = {
  index: { label: 'Início', Icon: House },
  patients: { label: 'Pacientes', Icon: ClipboardList },
  care: { label: 'Atendimento', Icon: Stethoscope },
  reports: { label: 'Relatórios', Icon: FileText },
  more: { label: 'Mais', Icon: Menu },
} as const;

type Props = BottomTabBarProps & { blurTarget: RefObject<View | null> };
type MeasuredItem = LayoutRectangle & { barWidth: number };

export function LiquidTabBar({ state, navigation, descriptors, insets, blurTarget }: Props) {
  const { isDark } = useTheme();
  const glassColors = getGlassColors(isDark);
  const { width: screenWidth } = useWindowDimensions();
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
    const movingRight = center >= (left.value + right.value) / 2;
    cancelAnimation(left);
    cancelAnimation(right);
    cancelAnimation(inflation);
    restingWidth.value = lensWidth;
    if (immediate || visible.value === 0) {
      left.value = targetLeft;
      right.value = targetRight;
      inflation.value = 0;
    } else {
      left.value = movingRight
        ? withDelay(liquidMotion.trailingDelay, withSpring(targetLeft, liquidMotion.trailing))
        : withSpring(targetLeft, liquidMotion.leading);
      right.value = movingRight
        ? withSpring(targetRight, liquidMotion.leading)
        : withDelay(liquidMotion.trailingDelay, withSpring(targetRight, liquidMotion.trailing));
      inflation.value = withSequence(
        withTiming(1, { duration: liquidMotion.inflateDuration }),
        withSpring(0, liquidMotion.inflationSpring),
      );
    }
    visible.value = 1;
  }, [left, right, restingWidth, visible, inflation]);

  useEffect(() => {
    const resized = previousWidth.current !== barWidth;
    if (selectedLayout?.barWidth === barWidth) {
      previousWidth.current = barWidth;
      scheduleOnUI(moveLens, selectedLayout.x, selectedLayout.width, reduceMotion || resized);
    }
  }, [moveLens, selectedLayout, reduceMotion, barWidth]);

  const lensStyle = useAnimatedStyle(() => {
    const base = restingWidth.value;
    const width = Math.max(base * 0.94, Math.min(Math.abs(right.value - left.value) + inflation.value * base * 0.16, base * liquidMotion.maxStretch));
    const stretch = Math.max(0, Math.min(1, (width / base - 1) / (liquidMotion.maxStretch - 1)));
    const height = metrics.lensHeight + inflation.value * liquidMotion.inflation - stretch * liquidMotion.squash;
    return {
      width,
      height,
      borderRadius: height / 2,
      opacity: visible.value * (1 - stretch * 0.22),
      transform: [
        { translateX: (left.value + right.value) / 2 - width / 2 },
        { translateY: metrics.lensCenterY - height / 2 },
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
          left: barLeft,
          bottom: tabBarBottom(insets.bottom),
          shadowColor: glassColors.shadow,
        },
      ]}
    >
      <View pointerEvents="none" style={[styles.capsule, { borderColor: glassColors.outline }]}>
        {supportsBlur && (
          <BlurView
            key={activeKey}
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
        <Animated.View
          testID="liquid-tab-lens"
          pointerEvents="none"
          style={[
            styles.lens,
            { backgroundColor: glassColors.lens, borderColor: glassColors.edge },
            lensStyle,
          ]}
        >
          <View style={[styles.lensInner, { borderColor: glassColors.lensOutline }]} />
          <View style={[styles.reflection, { borderColor: glassColors.reflection, backgroundColor: `${glassColors.surface}44` }]} />
          <View style={[styles.lowerReflection, { borderColor: `${glassColors.surface}AA` }]} />
        </Animated.View>
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
                if (Platform.OS !== 'web' || target.matches?.(':focus-visible')) setFocusedKey(route.key);
              }}
              onBlur={() => setFocusedKey(null)}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!active && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [
                styles.tab,
                pressed && { backgroundColor: glassColors.lens },
                focusedKey === route.key && { borderColor: glassColors.active },
              ]}
            >
              <View style={styles.icon}>
                <Icon size={22} color={active ? glassColors.active : glassColors.inactive} strokeWidth={active ? 2.3 : 1.8} />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={1.25}
                style={[
                  styles.label,
                  { color: active ? glassColors.active : glassColors.inactive },
                  screenWidth < 380 && { fontSize: 10, lineHeight: 14 },
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
  lens: { position: 'absolute', left: 0, top: 0, overflow: 'hidden', borderWidth: 1 },
  lensInner: { ...StyleSheet.absoluteFill, borderWidth: 1, borderRadius: 100 },
  reflection: {
    position: 'absolute',
    top: 1,
    left: '13%',
    right: '13%',
    height: 7,
    borderTopWidth: 1.5,
    borderRadius: 100,
  },
  lowerReflection: {
    position: 'absolute',
    bottom: 1,
    left: '22%',
    right: '22%',
    height: 4,
    borderBottomWidth: 1,
    borderRadius: 100,
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
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, marginTop: 5 },
  activeLabel: { fontFamily: fonts.semibold },
});
