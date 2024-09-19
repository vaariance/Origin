import "~/global.css";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider } from "@react-navigation/native";
import { Stack, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NavTheme } from "~/constants";
import { useColorScheme } from "~/lib/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import * as popins from "@expo-google-fonts/poppins";
import { GlobalProvider } from "~/context/provider";
import { Toaster } from "sonner-native";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { X } from "~/lib/icons/Close";
import { ArrowLeft } from "~/lib/icons/Back";
import BootSplash from "react-native-bootsplash";

export const defaultModalOptions = {
  presentation: "modal" as const,
  headerTitle: () => null,
  headerShadowVisible: false,
  headerLeft: () => null,
  headerRight: () => null,
};

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  const [loaded, error] = popins.useFonts({
    "poppins-regular": popins.Poppins_400Regular,
    "poppins-bold": popins.Poppins_700Bold,
    "poppins-semibold": popins.Poppins_600SemiBold,
    "poppins-medium": popins.Poppins_500Medium,
    "poppins-light": popins.Poppins_300Light,
    "poppins-thin": popins.Poppins_100Thin,
    "poppins-extralight": popins.Poppins_200ExtraLight,
    "poppins-black": popins.Poppins_900Black,
    "poppins-extra-bold": popins.Poppins_800ExtraBold,
    // italics
    "poppins-regular-italic": popins.Poppins_400Regular_Italic,
    "poppins-bold-italic": popins.Poppins_700Bold_Italic,
    "poppins-semibold-italic": popins.Poppins_600SemiBold_Italic,
    "poppins-medium-italic": popins.Poppins_500Medium_Italic,
    "poppins-light-italic": popins.Poppins_300Light_Italic,
    "poppins-thin-italic": popins.Poppins_100Thin_Italic,
    "poppins-extralight-italic": popins.Poppins_200ExtraLight_Italic,
    "poppins-black-italic": popins.Poppins_900Black_Italic,
    "poppins-extra-bold-italic": popins.Poppins_800ExtraBold_Italic,
  });

  const { colorScheme, setColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (error) throw error;
    (async () => {
      const theme = (await AsyncStorage.getItem("theme")) as
        | "dark"
        | "light"
        | null;

      if (!theme) {
        AsyncStorage.setItem("theme", colorScheme);
        setIsColorSchemeLoaded(true);
        return;
      }

      if (theme !== colorScheme) {
        setColorScheme(theme);
      }

      setAndroidNavigationBar(theme);
      setIsColorSchemeLoaded(true);
    })().finally(async () => {
      if (loaded) await BootSplash.hide({ fade: true });
    });
  }, [loaded, error]);

  if (!isColorSchemeLoaded || (!loaded && !error)) {
    return null;
  }

  const ArrowBack = () => (
    <Button
      onPress={() => navigation.goBack()}
      className="w-10 h-10 text-foreground"
      variant={"ghost"}
      size={"icon"}
    >
      <ArrowLeft className="text-foreground" />
    </Button>
  );

  const XClose = () => (
    <Button
      onPress={() => navigation.goBack()}
      className="w-10 h-10 text-foreground"
      variant={"ghost"}
      size={"icon"}
    >
      <X className="text-foreground" />
    </Button>
  );

  return (
    <GestureHandlerRootView>
      <GlobalProvider>
        <ThemeProvider value={NavTheme[colorScheme]}>
          <StatusBar style={colorScheme} />
          <Stack>
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="sign-in"
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="address-qr"
              options={{
                ...defaultModalOptions,
                headerRight: () => {
                  return <XClose />;
                },
              }}
            />
            <Stack.Screen
              name="[action]"
              options={{
                ...defaultModalOptions,
                headerLeft: () => {
                  return <ArrowBack />;
                },
              }}
            />
            <Stack.Screen
              name="actions/[action]"
              options={{
                ...defaultModalOptions,
                headerRight: () => {
                  return <XClose />;
                },
              }}
            />
            <Stack.Screen
              name="actions/action-success"
              options={{
                ...defaultModalOptions,
                headerRight: () => {
                  return <XClose />;
                },
              }}
            />
          </Stack>
          <PortalHost />
          <Toaster
            theme={colorScheme}
            toastOptions={{
              titleStyle: {
                fontFamily: "poppins-semibold",
                color: NavTheme[colorScheme].colors.text,
              },
              descriptionStyle: {
                fontFamily: "poppins-regular",
                color: NavTheme[colorScheme].colors.text,
              },
              style: {
                backgroundColor: NavTheme[colorScheme].colors.border,
                marginTop: "2%",
              },
            }}
          />
        </ThemeProvider>
      </GlobalProvider>
    </GestureHandlerRootView>
  );
}
