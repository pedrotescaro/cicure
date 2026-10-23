import { View, useWindowDimensions } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { cicurePaths } from './cicurePaths';
import { monogramGeometry as mark, wordmarkGeometry as geometry } from './monogramGeometry';
import { brandFrame, brandTimeline } from './brandTimeline';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedGroup = Animated.createAnimatedComponent(G);

function RevealedLetter({ index, progress, color }: { index: number; progress: SharedValue<number>; color: string }) {
  const props = useAnimatedProps(() => {
    const frame = brandFrame(progress.value, index);
    return { opacity: frame.letter, matrix: [1, 0, 0, 1, 5 * (1 - frame.letter), 9 * (1 - frame.letter)] };
  });
  return <AnimatedGroup animatedProps={props}><Path d={cicurePaths.letters[index + 1].d} fill={color} /></AnimatedGroup>;
}

/** Vector parts remain independent: one turn of the C, its point, then the Comfortaa letters. */
export function AnimatedLogo({ progress, width = 284, color }: { progress: SharedValue<number>; width?: number; color?: string }) {
  const { width: windowWidth } = useWindowDimensions();
  const { colors } = useTheme();
  const ink = color ?? colors.red;
  const displayWidth = Math.max(1, Math.min(width, windowWidth - 48));
  const group = useAnimatedProps(() => {
    const frame = brandFrame(progress.value);
    return { opacity: 1, matrix: [1, 0, 0, 1, (geometry.width / 2 - 50) * (1 - frame.expand), 10] };
  });
  const turn = useAnimatedProps(() => {
    const angle = brandFrame(progress.value).rotation * Math.PI / 180;
    const c = Math.cos(angle), s = Math.sin(angle);
    return { opacity: 1, matrix: [c, s, -s, c, 50 - 50 * c + 50 * s, 50 - 50 * s - 50 * c] };
  });
  const drawing = useAnimatedProps(() => {
    const frame = brandFrame(progress.value);
    return { strokeDashoffset: mark.revealLength * (1 - frame.draw), opacity: 1 - frame.fill };
  });
  const filled = useAnimatedProps(() => ({ opacity: brandFrame(progress.value).fill }));
  const point = useAnimatedProps(() => {
    const frame = brandFrame(progress.value);
    return { r: mark.dot.r * frame.dotScale, opacity: frame.dot };
  });
  return <View accessible accessibilityRole="image" accessibilityLabel="Cicure" testID="animated-logo" pointerEvents="none" style={{ width: displayWidth, height: displayWidth * 120 / geometry.width }}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${geometry.width} 120`}>
      <AnimatedGroup animatedProps={group}>
        <AnimatedGroup animatedProps={turn}>
          <AnimatedPath d={mark.revealPath} fill="none" stroke={ink} strokeWidth={16.4} strokeLinecap="round" strokeDasharray={[mark.revealLength, mark.revealLength]} animatedProps={drawing} />
          <AnimatedPath d={mark.path} fill={ink} animatedProps={filled} />
        </AnimatedGroup>
        <AnimatedCircle cx={mark.dot.cx} cy={mark.dot.cy} fill={ink} animatedProps={point} />
      </AnimatedGroup>
      <G transform={`translate(${geometry.suffixX} ${geometry.suffixY + 10}) scale(${geometry.suffixScale}) translate(${-geometry.suffixOriginX} ${-geometry.suffixOriginY})`}>
        {brandTimeline.letters.map((_, index) => <RevealedLetter key={index} index={index} progress={progress} color={ink} />)}
      </G>
    </Svg>
  </View>;
}
