import { defineConfig } from "vite";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    server: {
      deps: {
        inline: [
          "react-native",
          "@dreson4/react-native-quick-bip39",
          "@craftzdog/react-native-buffer",
          "react-native-quick-base64",
        ],
      },
    },
  },
});
