import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabContentBottom } from '../motion';

/** Scroll content clears both floating navigation and the new-attendance action. */
export function useTabContentInset() {
  return tabContentBottom(useSafeAreaInsets().bottom);
}
