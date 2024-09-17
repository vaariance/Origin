import { useMemo } from "react";
import { StyleSheet, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { NavTheme } from "~/constants";
import { Toast, ToastType } from "~/lib/toast";
import { NobleAddress } from "~/lib/useAuth";
import { useColorScheme } from "~/lib/useColorScheme";

type RampProps = {
  value: string;
  receiver: NobleAddress;
  email: string;
  product: "BUY" | "SELL";
};

export const Ramp = ({ value, receiver, email, product }: RampProps) => {
  const { colorScheme } = useColorScheme();

  const uri = useMemo(() => {
    const colors = NavTheme[colorScheme];
    const baseUrl = new URL("https://sandbox--kado.netlify.app/");
    const searchParams = new URLSearchParams({
      apiKey: "YOUR_WIDGET_ID",
      isMobileWebview: "true",
      onPayCurrency: "USD",
      onPayAmount: value,
      onToAddress: receiver,
      network: "NOBLE",
      onRevCurrency: "USDC",
      email,
      mode: "minimal",
      product,
      theme: colorScheme,
      primaryColor: colors.colors.primary,
      secondaryColor: colors.colors.secondary,
      successColor: colors.colors.success,
      warningColor: colors.colors.border,
      errorColor: colors.colors.notification,
      fiatMethodList: "card, debit_only",
    });
    return baseUrl.href + "?" + searchParams.toString();
  }, [colorScheme]);

  return (
    <WebView
      containerStyle={styles.modalContainer}
      onMessage={(event) => {
        const eventData = event?.nativeEvent?.data;
        try {
          const message = JSON.parse(eventData);
          if (message && message?.type === "PLAID_NEW_ACH_LINK") {
            const achLink = message?.payload?.link;
            Linking.openURL(achLink);
          }
        } catch (error) {
          Toast.show({
            text1: "ACH Link Error",
            type: ToastType.Error,
          });
        }
      }}
      allowUniversalAccessFromFileURLs
      geolocationEnabled
      javaScriptEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      originWhitelist={["*"]}
      source={{ uri }}
      allowsBackForwardNavigationGestures
      onError={() => {
        Toast.show({
          text1: "Something went wrong",
          type: ToastType.Error,
        });
      }}
      style={styles.webview}
    />
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0)",
  },
  webview: {
    width: "100%",
    height: "100%",
  },
});
