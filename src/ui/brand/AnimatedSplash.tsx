import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
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
import { colors } from '../theme';
import { useMotionPreferences } from '../useMotionPreferences';
import { AnimatedLogo } from './AnimatedLogo';

type AnimatedSplashProps = {
  /** The initial route has its resources and has completed its first layout. */
  ready: boolean;
  onFinish: () => void;
};

/** Native white launch screen -> vector drawing -> the already-laid-out app. */
export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const { reduceMotion } = useMotionPreferences();
  const [hasLayout, setHasLayout] = useState(false);
  const [nativeHidden, setNativeHidden] = useState(false);
  const [revealFinished, setRevealFinished] = useState(false);
  const motionSkipped = useRef(false);
  const drawProgress = useSharedValue(0);
  const fillProgress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const markRevealFinished = useCallback(() => setRevealFinished(true), []);

  useEffect(() => {
    if (!hasLayout) return;
    let mounted = true;
    let frame: number | undefined;

    // The overlay is already painted in the native splash's background color.
    // Wait one frame after hiding it before advancing the initially empty SVG.
    void SplashScreen.hideAsync().catch(() => {
      // Expo Go/web may not own a native splash; the React sequence still runs.
    }).finally(() => {
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
    if (!nativeHidden) return;
    if (reduceMotion || motionSkipped.current) {
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
      onFinish();
      return;
    }
    opacity.value = withTiming(0, {
      duration: logoMotion.exitDuration,
      easing: Easing.out(Easing.quad),
    }, finished => {
      if (finished) runOnJS(onFinish)();
    });
    return () => cancelAnimation(opacity);
  }, [onFinish, opacity, ready, reduceMotion, revealFinished]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      testID="animated-splash"
      accessibilityViewIsModal
      importantForAccessibility="yes"
      onLayout={() => setHasLayout(true)}
      style={[styles.overlay, animatedStyle]}
    >
      <AnimatedLogo drawProgress={drawProgress} fillProgress={fillProgress} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
