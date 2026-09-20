import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** Keep live OS/browser changes in sync, as well as Reanimated's startup value. */
export function useMotionPreferences() {
  const initialReducedMotion = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(initialReducedMotion);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Independent DOM listeners avoid RN Web's shared handler registry:
      // unmounting the splash must not remove the tab bar's subscription.
      const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
      const transparencyMedia = window.matchMedia('(prefers-reduced-transparency: reduce)');
      const onMotion = () => setReduceMotion(motionMedia.matches);
      const onTransparency = () => setReduceTransparency(transparencyMedia.matches);
      onMotion();
      onTransparency();
      motionMedia.addEventListener('change', onMotion);
      transparencyMedia.addEventListener('change', onTransparency);
      return () => {
        motionMedia.removeEventListener('change', onMotion);
        transparencyMedia.removeEventListener('change', onTransparency);
      };
    }
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const transparency = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduceTransparency);
    if (Platform.OS === 'ios') {
      void AccessibilityInfo.isReduceTransparencyEnabled().then(value => {
        if (mounted) setReduceTransparency(value);
      });
    }
    return () => {
      mounted = false;
      motion.remove();
      transparency.remove();
    };
  }, []);

  return { reduceMotion, reduceTransparency };
}
