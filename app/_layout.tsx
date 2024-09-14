import "~/global.css";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme, ThemeProvider } from "@react-navigation/native";
import { router, SplashScreen, Stack, useNavigation } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NAV_THEME } from "~/constants";
import { useColorScheme } from "~/lib/useColorScheme";
import { PortalHost } from "@rn-primitives/portal";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import * as popins from "@expo-google-fonts/poppins";
import { GlobalProvider } from "~/context/provider";
import Toast, { type BaseToastProps } from "react-native-toast-message";
import { Text } from "~/components/ui/text";
import Animated, { StretchInX, StretchOutY } from "react-native-reanimated";
import { cn } from "~/lib/utils";
import { ViewProps } from "react-native";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { X } from "~/lib/icons/Close";
import { ArrowLeft } from "~/lib/icons/Back";

const toastConfig = {
  lettuce: ({ text1, text2, ...props }: ViewProps & BaseToastProps) => (
    <Animated.View
      {...props}
      entering={StretchInX.duration(500)}
      exiting={StretchOutY.duration(500)}
      className={cn(
        "rounded-2xl flex-1 justify-center w-3/4 py-2 px-6 mt-4 h-14 text-white shadow-lg bg-success backdrop-blur-sm font-poppins-regular",
        props.className
      )}
    >
      <Text className="text-base font-semibold font-poppins-semibold">
        {text1}
      </Text>
      {text2 && <Text>{text2}</Text>}
    </Animated.View>
  ),
  tomato: ({ text1, text2, ...props }: ViewProps & BaseToastProps) => (
    <Animated.View
      {...props}
      entering={StretchInX.duration(500)}
      exiting={StretchOutY.duration(500)}
      className={cn(
        "rounded-2xl flex-1 justify-center w-3/4 py-2 px-6 mt-4 h-14 text-white shadow-lg bg-destructive backdrop-blur-sm font-poppins-regular",
        props.className
      )}
    >
      <Text className="text-base font-semibold font-poppins-semibold">
        {text1}
      </Text>
      {text2 && <Text>{text2}</Text>}
    </Animated.View>
  ),
};

const LIGHT_THEME: Theme = {
  dark: false,
  colors: NAV_THEME.light,
};

const DARK_THEME: Theme = {
  dark: true,
  colors: NAV_THEME.dark,
};

export const defaultModalOptions = {
  presentation: "modal" as const,
  headerTitle: () => null,
  headerShadowVisible: false,
  headerLeft: () => null,
  headerRight: () => null,
};

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

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

  const { colorScheme, setColorScheme, isDarkColorScheme } = useColorScheme();
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    if (error) throw error;
    (async () => {
      const theme = await AsyncStorage.getItem("theme");
      if (!theme) {
        AsyncStorage.setItem("theme", "light");
        setIsColorSchemeLoaded(true);
        return;
      }
      const colorTheme = "light";
      if (colorTheme !== colorScheme) {
        setColorScheme(colorTheme);
        setAndroidNavigationBar(colorTheme);
        setIsColorSchemeLoaded(true);
        return;
      }
      setAndroidNavigationBar(colorTheme);
      setIsColorSchemeLoaded(true);
    })().finally(() => {
      if (loaded) SplashScreen.hideAsync();
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
        <ThemeProvider value={LIGHT_THEME}>
          <StatusBar style={"light"} />
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
          <Toast config={toastConfig} />
        </ThemeProvider>
      </GlobalProvider>
    </GestureHandlerRootView>
  );
}
