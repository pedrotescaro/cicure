import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { logoMotion } from '../motion';
import { colors } from '../theme';
import { cicurePaths } from './cicurePaths';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const letterDuration = 1 - logoMotion.letterStagger * (cicurePaths.letters.length - 1);

type LogoContour = {
  readonly d: string;
  readonly length: number;
  readonly start: number;
  readonly duration: number;
};

export type AnimatedLogoProps = {
  /** A linear, global 0..1 value; the per-letter stagger is applied internally. */
  drawProgress: SharedValue<number>;
  /** Advance 0..1 after drawProgress reaches 1. Set both to 1 for reduced motion. */
  fillProgress: SharedValue<number>;
  width?: number;
  color?: string;
};

function DrawnContour({
  contour,
  letterIndex,
  drawProgress,
  fillProgress,
  color,
}: {
  contour: LogoContour;
  letterIndex: number;
  drawProgress: SharedValue<number>;
  fillProgress: SharedValue<number>;
  color: string;
}) {
  const { length, start, duration } = contour;
  const letterStart = letterIndex * logoMotion.letterStagger;
  const animatedProps = useAnimatedProps(() => {
    const letterProgress = Math.max(0, Math.min(1, (drawProgress.value - letterStart) / letterDuration));
    const progress = Math.max(0, Math.min(1, (letterProgress - start) / duration));
    return {
      strokeDashoffset: length * (1 - progress),
      // A rounded dash cap otherwise leaves a dot before a contour starts.
      // Visibility never reveals a letter: its actual path is drawn by the dash.
      opacity: progress > 0 ? 1 - fillProgress.value : 0,
    };
  }, [duration, length, letterStart, start]);

  return (
    <AnimatedPath
      d={contour.d}
      animatedProps={animatedProps}
      fill="none"
      stroke={color}
      strokeWidth={logoMotion.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[length, length]}
    />
  );
}

function FilledLetter({ d, fillProgress, color }: {
  d: string;
  fillProgress: SharedValue<number>;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    fillOpacity: Math.max(0, Math.min(1, fillProgress.value)),
  }));

  // Keep the source font's nonzero winding: Comfortaa has overlapping contours.
  return <AnimatedPath d={d} fill={color} fillRule="nonzero" animatedProps={animatedProps} />;
}

/** Real Comfortaa Bold outlines; all geometry stays fixed throughout the reveal. */
export function AnimatedLogo({
  drawProgress,
  fillProgress,
  width = logoMotion.width,
  color = colors.red,
}: AnimatedLogoProps) {
  const { width: windowWidth } = useWindowDimensions();
  const displayWidth = Math.max(1, Math.min(width, windowWidth - 64));
  const displayHeight = displayWidth * cicurePaths.height / cicurePaths.width;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="cicure"
      pointerEvents="none"
      testID="animated-logo"
      style={{ width: displayWidth, height: displayHeight }}
    >
      <Svg
        width={displayWidth}
        height={displayHeight}
        viewBox={`0 0 ${cicurePaths.width} ${cicurePaths.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {cicurePaths.letters.map((letter, letterIndex) => (
          <React.Fragment key={`${letter.letter}-${letterIndex}`}>
            <FilledLetter d={letter.d} fillProgress={fillProgress} color={color} />
            {letter.contours.map((contour, contourIndex) => (
              <DrawnContour
                key={contourIndex}
                contour={contour}
                letterIndex={letterIndex}
                drawProgress={drawProgress}
                fillProgress={fillProgress}
                color={color}
              />
            ))}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
