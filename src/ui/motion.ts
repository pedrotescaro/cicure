import { colors } from './theme';

// One place to tune the reference motion; times are milliseconds.
export const logoMotion = {
  drawDuration: 1400,
  fillDuration: 250,
  holdDuration: 250,
  exitDuration: 180,
  letterStagger: 0.14,
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

// App surfaces currently have a single, light theme. Derive glass from it;
// don't put a dark navigation bar over the existing white clinical screens.
export const glassColors = {
  surface: colors.surface,
  wash: `${colors.surface}B8`,
  fallback: `${colors.surface}ED`,
  edge: `${colors.surface}F0`,
  outline: `${colors.dark}14`,
  lens: `${colors.red}0C`,
  lensOutline: `${colors.red}20`,
  reflection: `${colors.surface}F5`,
  shadow: colors.dark,
  active: colors.red,
  inactive: colors.secondary,
} as const;

export function tabBarBottom(inset: number) {
  return Math.max(inset, navigationMetrics.bottomGap);
}

export function tabContentBottom(inset: number) {
  return tabBarBottom(inset) + navigationMetrics.height + navigationMetrics.fabGap
    + navigationMetrics.fabSize + navigationMetrics.contentGap;
}
