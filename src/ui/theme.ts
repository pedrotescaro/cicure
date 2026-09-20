import { useColorScheme } from 'react-native';
import { useStore, type ThemeMode } from '../data/store';

export type ColorPalette = {
  bg: string;
  surface: string;
  surfaceSubtle: string;
  dark: string;
  red: string;
  redPressed: string;
  redSoft: string;
  text: string;
  secondary: string;
  tertiary: string;
  border: string;
  green: string;
  greenSoft: string;
  amber: string;
  amberSoft: string;
};

export const lightColors: ColorPalette = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F7F7F8',
  dark: '#1A1A1A',
  red: '#D62828',
  redPressed: '#B01F1F',
  redSoft: '#FDECEC',
  text: '#141414',
  secondary: '#626262',
  tertiary: '#8A8A8A',
  border: '#E6E6E6',
  green: '#2E7D5B',
  greenSoft: '#E8F5EF',
  amber: '#C77D00',
  amberSoft: '#FFF4E0',
};

export const darkColors: ColorPalette = {
  bg: '#121212',
  surface: '#1C1C1E',
  surfaceSubtle: '#28282B',
  dark: '#FFFFFF',
  red: '#FF4D4D',
  redPressed: '#E03636',
  redSoft: '#2E1517',
  text: '#F5F5F7',
  secondary: '#A1A1A8',
  tertiary: '#73737C',
  border: '#2C2C30',
  green: '#38A169',
  greenSoft: '#142A1D',
  amber: '#E58A13',
  amberSoft: '#2E1E0F',
};

// Default fallback for legacy static reads
export const colors: ColorPalette = lightColors;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  brand: 'Comfortaa_700Bold',
};

export function getThemeColors(isDark: boolean): ColorPalette {
  return isDark ? darkColors : lightColors;
}

export function useTheme() {
  const systemScheme = useColorScheme();
  const themeMode = useStore(s => s.themeMode);
  const setThemeMode = useStore(s => s.setThemeMode);

  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  const activeColors = isDark ? darkColors : lightColors;

  return {
    colors: activeColors,
    isDark,
    themeMode,
    setThemeMode,
    fonts,
  };
}
