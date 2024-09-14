import {
  StyleSheet,
  useColorScheme as useCSSColorScheme,
} from "react-native-css-interop";

export function useColorScheme() {
  const cs = useCSSColorScheme();
  return {
    ...cs,
    colorScheme: cs.colorScheme ?? "dark",
    isDarkColorScheme: cs.colorScheme === "dark",
    setColorScheme(scheme: Parameters<typeof cs.setColorScheme>[0]) {
      if ("getFlag" in StyleSheet) {
        const darkMode = StyleSheet.getFlag("darkMode") ?? "media";
        if (darkMode === "media") {
          throw new Error(
            "Unable to manually set color scheme without using darkMode: class. See: https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually"
          );
        }
      }

      cs?.setColorScheme(scheme);
    },
    toggleColorScheme() {
      if ("getFlag" in StyleSheet) {
        const darkMode = StyleSheet.getFlag("darkMode") ?? "media";
        if (darkMode === "media") {
          throw new Error(
            "Unable to manually set color scheme without using darkMode: class. See: https://tailwindcss.com/docs/dark-mode#toggling-dark-mode-manually"
          );
        }
      }

      cs?.toggleColorScheme();
    },
  };
}
