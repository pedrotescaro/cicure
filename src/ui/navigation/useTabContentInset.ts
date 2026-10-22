import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabContentBottom } from '../motion';
import { useWindowDimensions } from 'react-native';

/** Scroll content clears both floating navigation and the new-attendance action. */
export function useTabContentInset() {
  const { fontScale } = useWindowDimensions();
  return tabContentBottom(useSafeAreaInsets().bottom) + Math.max(0, fontScale - 1) * 84;
}
