import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { useMotionPreferences } from '../useMotionPreferences';
import { AnimatedLogo } from './AnimatedLogo';
import { brandTimeline, canDismissBrand } from './brandTimeline';

export function AnimatedSplash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotionPreferences();
  const [revealed, setRevealed] = useState(false);
  const finished = useRef(false);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const markRevealed = useCallback(() => setRevealed(true), []);
  const finish = useCallback(() => { if (!finished.current) { finished.current = true; onFinish(); } }, [onFinish]);

  useEffect(() => { void SplashScreen.hideAsync().catch(() => {}); }, []);
  useEffect(() => {
    if (reduceMotion) { progress.set(brandTimeline.duration); return; }
    progress.set(0);
    progress.set(withTiming(brandTimeline.duration, { duration: brandTimeline.duration, easing: Easing.linear }, complete => { if (complete) runOnJS(markRevealed)(); }));
    // Recover a delayed animation callback, but never bypass resource readiness.
    const fallback = setTimeout(markRevealed, brandTimeline.duration + 700);
    return () => { clearTimeout(fallback); cancelAnimation(progress); };
  }, [progress, reduceMotion, markRevealed]);

  useEffect(() => {
    if (!canDismissBrand(ready, revealed || reduceMotion)) return;
    if (reduceMotion) { finish(); return; }
    opacity.set(withTiming(0, { duration: brandTimeline.exit, easing: Easing.out(Easing.cubic) }, complete => { if (complete) runOnJS(finish)(); }));
    return () => cancelAnimation(opacity);
  }, [ready, revealed, reduceMotion, finish, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View testID="animated-splash" accessibilityViewIsModal importantForAccessibility="yes" style={[styles.overlay, { backgroundColor: colors.bg }, style]}>
    <AnimatedLogo progress={progress} color={colors.red} />
  </Animated.View>;
}

const styles = StyleSheet.create({ overlay: { ...StyleSheet.absoluteFill, zIndex: 100, alignItems: 'center', justifyContent: 'center' } });
