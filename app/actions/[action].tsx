import { View } from "react-native";
import { useEffect, useState } from "react";
import NfcActiveAnimate from "~/components/NfcActiveAnimate";
import { SmartphoneNfc } from "~/lib/icons/HceOutgoing";
import { MotiView } from "moti";
import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
} from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { SlideInDown } from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Noble } from "~/lib/icons/Noble";
import { router, useLocalSearchParams } from "expo-router";
import NfcManager, { NfcTech } from "react-native-nfc-manager";
import {
  HCESession as _HCESession,
  NFCTagType4NDEFContentType,
  NFCTagType4,
} from "react-native-hce";
import { useGlobalContext } from "~/context/provider";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Action as ActionType } from "~/constants";
import { BiometricAnimate } from "~/components/BiometricAnimate";
import { Ramp } from "~/components/Ramp";
import { Toast, ToastType } from "~/lib/toast";
import { NobleAddress, useAuth } from "~/lib/useAuth";
import { fromBase64, fromHex } from "~/lib/cosmos/crypto";
import { Account } from "~/lib/cosmos/account";

const HCESession = Object.assign(_HCESession, {
  async initialize(tag: NFCTagType4) {
    const session = await HCESession.getInstance();
    await session.setApplication(tag);
    await session.setEnabled(true);
    return session;
  },
  async start(tag: () => NFCTagType4, onRead?: () => void) {
    const session = await this.initialize(tag());
    const cancel = session.on(_HCESession.Events.HCE_STATE_READ, () => {
      onRead?.();
      cancel();
    });
    return session;
  },
});

const Action = () => {
  const { user, getValueFor } = useGlobalContext();
  const { parsePayCommand, executePayCommand } = useAuth();
  const { action, value } = useLocalSearchParams<
    Record<string, string> & { action: string }
  >();
  const [message, setMessage] = useState<Record<string, string>>();
  const [isRead, setIsRead] = useState<boolean>(false);
  const [hceSession, setHceSession] = useState<_HCESession>();

  const tag = () =>
    new NFCTagType4({
      type: NFCTagType4NDEFContentType.Text,
      content: JSON.stringify({
        address: user?.address,
        name: user?.name,
        avatar: user?.avatar,
      }),
      writable: false,
    });

  useEffect(() => {
    switch (action) {
      case ActionType.Send:
        NfcManager.start().then(readNdef);
        break;
      case ActionType.Receive:
        HCESession.start(tag, () => setIsRead(true)).then(setHceSession);
        break;
      case ActionType.Buy:
        break;
      case ActionType.Sell:
      default:
        cleanUp(action);
        break;
    }
  }, []);

  const transfer = async () => {
    const key = await getValueFor?.("origin_al_key");
    if (user && message && key) {
      const account = Account.fromMnemonic(JSON.parse(key).unencryptedKey);
      await executePayCommand({
        onSuccess: () => {
          router.navigate("/actions/action-success");
        },
        onError: (reason) => {
          Toast.show({
            text1: reason,
            type: ToastType.Error,
          });
        },
        sign: async (signDoc) => {
          const signed = await account.signDirect(user.address, signDoc);
          return [signed.signed, signed.signature];
        },
        getPublicKey: async () => {
          switch (user.publicKeyEncodedType) {
            case "hex":
              return fromHex(user.publicKey);
            case "base64":
              return fromBase64(user.publicKey);
            default:
              return user.publicKey;
          }
        },
        command: parsePayCommand({
          from: user.address,
          to: message.address as NobleAddress,
          amount: (Number(value) * 1e6).toString(),
          memo: "",
        }),
      });
    }
  };

  async function readNdef() {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    await NfcManager.ndefHandler
      .getNdefMessage()
      .then((msg) => {
        const message = JSON.parse(msg?.ndefMessage[0].payload[0]);
        setMessage(message);
      })
      .then(transfer)
      .catch((e) => {
        console.log(e);
        Toast.show({
          text1: "Unable to connect to receipient",
          text2: "please cancel current session an re-initiate request",
          type: ToastType.Error,
        });
      })
      .finally(async () => {
        await NfcManager.cancelTechnologyRequest();
      });
  }

  async function cleanUp(action: string) {
    switch (action) {
      case ActionType.Send:
        await NfcManager.cancelTechnologyRequest();
        break;
      case ActionType.Receive:
        await hceSession?.setEnabled(false);
        break;
      case ActionType.Buy:
        break;
      case ActionType.Sell:
      default:
        break;
    }
    router.navigate("/");
  }

  if (action === ActionType.Buy || action === ActionType.Sell) {
    return (
      <Ramp
        value={value}
        receiver={user!.address}
        email={user!.id}
        product={action}
      />
    );
  }

  return (
    <View className="flex-1">
      <NfcActiveAnimate success={isRead}>
        <SmartphoneNfc className="w-8 h-8 text-white" />
      </NfcActiveAnimate>
      <MotiView className="h-1/2 pb-9" entering={SlideInDown.duration(500)}>
        <Card
          className="mx-auto h-full items-center
         rounded-[28px] bg-accent shadow-2xl w-11/12 border-accent justify-between py-4 backdrop-blur-2xl"
        >
          <CardHeader className="gap-4">
            {message ? (
              <CardContent>
                <Badge
                  variant={"outline"}
                  className="flex-row gap-2 py-1.5 px-2 w-min mb-16 bg-success"
                >
                  <Avatar alt="Wallet Avatar">
                    <AvatarImage source={{ uri: message.avatar }} />
                    <AvatarFallback>
                      <Noble className="h-fit w-fit" />
                    </AvatarFallback>
                  </Avatar>
                  <Text
                    numberOfLines={1}
                    className="text-md font-semibold font-poppins-semibold"
                  >
                    {`${message.name} - ${message.address?.slice(
                      0,
                      6
                    )}...${message.address.slice(-8)}`}
                  </Text>
                </Badge>
              </CardContent>
            ) : (
              <CardTitle className="text-4xl text-center font-semibold font-poppins-semibold">
                {isRead
                  ? "Complete!"
                  : action === ActionType.Receive
                    ? "Waiting for sender"
                    : "Waiting for receiver"}
              </CardTitle>
            )}
            <CardDescription className="text-xl text-center font-poppins-regular">
              {isRead
                ? "Sender has your details, you can now close this page"
                : message
                  ? "Please authenticate to complete payment"
                  : action === ActionType.Receive
                    ? "move your device closer to the sender"
                    : "move your device closer to the receipient"}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            {message ? (
              <BiometricAnimate />
            ) : (
              <Button
                className="rounded-2xl shadow-lg p-4"
                onPress={() => cleanUp(action)}
              >
                <Text className="font-bold font-poppins-bold">
                  {isRead ? "Close" : "Cancel"}
                </Text>
              </Button>
            )}
          </CardFooter>
        </Card>
      </MotiView>
    </View>
  );
};

export default Action;
