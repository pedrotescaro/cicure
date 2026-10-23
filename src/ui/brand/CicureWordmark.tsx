import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useTheme } from '../theme';
import { cicurePaths } from './cicurePaths';
import { monogramGeometry, wordmarkGeometry as geometry } from './monogramGeometry';

export type CicureWordmarkProps = {
  /** Total visual height in dp; proportions follow the supplied brand reference. */
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** The icon's C and point followed by literal `icure`, in the real Comfortaa Bold outlines. */
export function CicureWordmark({ size = 32, color, style, accessibilityLabel = 'Cicure' }: CicureWordmarkProps) {
  const { colors } = useTheme();
  const ink = color ?? colors.red;
  return <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={[{ width: size * geometry.width / geometry.height, height: size }, style]}>
    <Svg width="100%" height="100%" viewBox={`0 0 ${geometry.width} ${geometry.height}`}>
      <Path d={monogramGeometry.path} fill={ink} />
      <Circle {...monogramGeometry.dot} fill={ink} />
      <G transform={`translate(${geometry.suffixX} ${geometry.suffixY}) scale(${geometry.suffixScale}) translate(${-geometry.suffixOriginX} ${-geometry.suffixOriginY})`}>
        {cicurePaths.letters.slice(1).map((letter, index) => <Path key={index} d={letter.d} fill={ink} fillRule="nonzero" />)}
      </G>
    </Svg>
  </View>;
}
