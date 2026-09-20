import { colors, darkColors, lightColors } from './theme';

// Reference motion configuration; times are milliseconds.
export const logoMotion = {
  drawDuration: 350,
  fillDuration: 120,
  holdDuration: 80,
  exitDuration: 140,
  letterStagger: 0.08,
  strokeWidth: 1.25,
  width: 260,
} as const;

export const liquidMotion = {
  leading: { duration: 270, dampingRatio: 0.76 },
  trailing: { duration: 300, dampingRatio: 0.82 },
  trailingDelay: 48,
  inflateDuration: 100,
  inflation: 18,
  inflationSpring: { duration: 260, dampingRatio: 0.72 },
  maxStretch: 2.35,
  squash: 4,
} as const;

export const navigationMetrics = {
  height: 72,
  maxWidth: 520,
  sideMargin: 12,
  padding: 6,
  bottomGap: 12,
  lensWidth: 62,
  lensHeight: 44,
  lensCenterY: 27,
  fabSize: 56,
  fabGap: 12,
  contentGap: 20,
} as const;

export function getGlassColors(isDark: boolean) {
  const c = isDark ? darkColors : lightColors;
  if (isDark) {
    return {
      surface: c.surface,
      wash: `${c.surface}E0`,
      fallback: `${c.surface}F2`,
      edge: '#2C2C30',
      outline: 'rgba(255, 255, 255, 0.10)',
      lens: `${c.red}25`,
      lensOutline: `${c.red}50`,
      reflection: 'rgba(255, 255, 255, 0.12)',
      shadow: '#000000',
      active: c.red,
      inactive: c.secondary,
    };
  }
  return {
    surface: c.surface,
    wash: `${c.surface}B8`,
    fallback: `${c.surface}ED`,
    edge: `${c.surface}F0`,
    outline: `${c.dark}14`,
    lens: `${c.red}0C`,
    lensOutline: `${c.red}20`,
    reflection: `${c.surface}F5`,
    shadow: c.dark,
    active: c.red,
    inactive: c.secondary,
  };
}

// Default export for backward compatibility
export const glassColors = getGlassColors(false);

export function tabBarBottom(inset: number) {
  return Math.max(inset, navigationMetrics.bottomGap);
}

export function tabContentBottom(inset: number) {
  return tabBarBottom(inset) + navigationMetrics.height + navigationMetrics.fabGap
    + navigationMetrics.fabSize + navigationMetrics.contentGap;
}
