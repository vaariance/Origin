import { View } from "react-native";
import Animated, { SlideInDown } from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import { NobleAddress, useAuth } from "~/lib/useAuth";
import { router } from "expo-router";
import { OriginUser, useGlobalContext } from "~/context/provider";
import { useState } from "react";
import { toHex } from "~/lib/cosmos/crypto";
import { Toast, ToastType } from "~/lib/toast";

export default function Onboarding() {
  const { signIn, newSigningKey } = useAuth();
  const { save, saveUser, setUser, setSignedIn } = useGlobalContext();
  const [blocking, setBlocking] = useState(false);

  const handleSignIn = async () => {
    setBlocking(true);
    const handleSuccess = async (response: Record<string, any>) => {
      const key = newSigningKey();
      const account = (await key.getAccounts())[0];
      const user: OriginUser = {
        name: response?.displayName,
        token: response?.idToken,
        id: response?.userId,
        avatar: response?.photoUrl,
        appSync: "pending",
        publicKey: toHex(account.pubkey),
        publicKeyEncodedType: "hex",
        address: account.address as NobleAddress,
      };
      await Promise.all([
        saveUser?.(user),
        save?.(
          "origin_al_key",
          JSON.stringify({
            unencryptedKey: key.mnemonic,
          })
        ),
      ]);
      setUser?.(user);
      setSignedIn?.(true);
      router.replace("/");
    };

    const handleError = (reason: string) => {
      Toast.show({
        text1: reason,
        type: ToastType.Error,
      });
      setBlocking(false);
    };

    await signIn({ onSuccess: handleSuccess, onError: handleError });
    setBlocking(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background h-full">
      <View className="h-1/2 justify-center items-center">
        <Animated.Image
          source={require("~/assets/images/icon.png")}
          className="w-72 h-72"
        />
      </View>
      <Animated.View className="h-1/2" entering={SlideInDown.duration(500)}>
        <Card
          className="w-full h-full items-center
         rounded-t-[36px] bg-accent shadow-xl justify-between backdrop-blur py-4"
        >
          <CardHeader className="gap-4">
            <CardTitle className="text-5xl text-center font-bold font-poppins-bold">
              Origin Wallet, where simplicity begins
            </CardTitle>
            <CardDescription className="text-xl font-poppins-regular">
              Unlock a new world of simple, instant, secure USDC payments
              anywhere.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              className="w-full rounded-2xl shadow-lg"
              size={"lg"}
              disabled={blocking}
              onPress={handleSignIn}
            >
              <Text className="font-bold font-poppins-bold">
                Continue with Google
              </Text>
            </Button>
          </CardFooter>
        </Card>
      </Animated.View>
    </SafeAreaView>
  );
}
