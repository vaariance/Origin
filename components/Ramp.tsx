import { StyleSheet, Linking } from "react-native";
import Toast from "react-native-toast-message";
import { WebView } from "react-native-webview";
import { ToastType } from "~/lib/utils";

export const Ramp = ({ uri }: { uri: string }) => {
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
