import { useColorScheme as useColorSchemeRN } from 'react-native';

export function useColorScheme() {
  const colorScheme = useColorSchemeRN();
  return colorScheme ?? 'light';
}
