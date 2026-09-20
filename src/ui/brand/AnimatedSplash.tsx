import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { logoMotion } from '../motion';
import { useTheme } from '../theme';
import { useMotionPreferences } from '../useMotionPreferences';
import { AnimatedLogo } from './AnimatedLogo';

type AnimatedSplashProps = {
  /** The initial route has its resources and has completed its first layout. */
  ready: boolean;
  onFinish: () => void;
};

/** Native launch screen -> vector drawing -> the already-laid-out app. */
export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotionPreferences();
  const [hasLayout, setHasLayout] = useState(false);
  const [nativeHidden, setNativeHidden] = useState(false);
  const [revealFinished, setRevealFinished] = useState(false);
  const motionSkipped = useRef(false);
  const finishedRef = useRef(false);
  const drawProgress = useSharedValue(0);
  const fillProgress = useSharedValue(0);
  const opacity = useSharedValue(1);

  const safeFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  }, [onFinish]);

  const markRevealFinished = useCallback(() => setRevealFinished(true), []);

  // Failsafe timeout: ensure the app never stays blocked on splash screen
  useEffect(() => {
    const timeoutDuration = Platform.OS === 'web' ? 500 : 1200;
    const timer = setTimeout(() => {
      safeFinish();
    }, timeoutDuration);
    return () => clearTimeout(timer);
  }, [safeFinish]);

  useEffect(() => {
    if (!hasLayout) return;
    let mounted = true;
    let frame: number | undefined;

    void SplashScreen.hideAsync().catch(() => {}).finally(() => {
      if (!mounted) return;
      frame = requestAnimationFrame(() => {
        if (mounted) setNativeHidden(true);
      });
    });

    return () => {
      mounted = false;
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [hasLayout]);

  useEffect(() => {
    if (!nativeHidden && Platform.OS !== 'web') return;

    if (Platform.OS === 'web' || reduceMotion || motionSkipped.current) {
      motionSkipped.current = true;
      drawProgress.value = 1;
      fillProgress.value = 1;
      setRevealFinished(true);
      return;
    }

    drawProgress.value = withTiming(1, {
      duration: logoMotion.drawDuration,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    }, drawn => {
      if (!drawn) return;
      fillProgress.value = withSequence(
        withTiming(1, {
          duration: logoMotion.fillDuration,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: ReduceMotion.Never,
        }),
        withDelay(logoMotion.holdDuration, withTiming(1, { duration: 0 }, held => {
          if (held) runOnJS(markRevealFinished)();
        })),
      );
    });

    return () => {
      cancelAnimation(drawProgress);
      cancelAnimation(fillProgress);
    };
  }, [drawProgress, fillProgress, markRevealFinished, nativeHidden, reduceMotion]);

  useEffect(() => {
    if (!ready || !revealFinished) return;
    if (reduceMotion) {
      safeFinish();
      return;
    }
    opacity.value = withTiming(0, {
      duration: logoMotion.exitDuration,
      easing: Easing.out(Easing.quad),
    }, finished => {
      if (finished) runOnJS(safeFinish)();
    });
    return () => cancelAnimation(opacity);
  }, [ready, reduceMotion, revealFinished, safeFinish, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      testID="animated-splash"
      accessibilityViewIsModal
      importantForAccessibility="yes"
      onLayout={() => setHasLayout(true)}
      style={[styles.overlay, { backgroundColor: colors.bg }, animatedStyle]}
    >
      <AnimatedLogo drawProgress={drawProgress} fillProgress={fillProgress} color={colors.red} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
