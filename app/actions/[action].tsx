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
// import { BiometricAnimate } from "~/components/BiometricAnimate";
import { Ramp } from "~/components/Ramp";
import { Toast, ToastType } from "~/lib/toast";
import { NobleAddress, useAuth } from "~/lib/useAuth";
import { fromBase64, fromHex } from "~/lib/cosmos/crypto";
import { Account } from "~/lib/cosmos/account";
import { decodeNDEFTextRecord, textDecoder } from "~/lib/utils";

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
      case ActionType.Sell:
      default:
        cleanUp(action);
        break;
    }
  }, []);

  const transfer = async (message: Record<string, string> | undefined) => {
    const key = await getValueFor?.("origin_al_key");
    if (user && message && key) {
      setMessage(message);
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
          amount: Math.floor(Number(value) * 1e6).toString(),
          memo: "",
        }),
      });
    }
  };

  async function readNdef() {
    let message: Record<string, string> | undefined = undefined;
    try {
      await NfcManager.requestTechnology(NfcTech.IsoDep);

      // MARK 1 - select NDEF tag application
      const selectNdefApp = [
        0x00, 0xa4, 0x04, 0x00, 0x07, 0xd2, 0x76, 0x00, 0x00, 0x85, 0x01, 0x01,
        0x00,
      ];
      const selectResponse =
        await NfcManager.isoDepHandler.transceive(selectNdefApp);

      if (
        selectResponse[selectResponse.length - 2] !== 0x90 ||
        selectResponse[selectResponse.length - 1] !== 0x00
      ) {
        throw new Error("Failed to select NDEF application");
      }

      // MARK 2 - select capability container
      const selectCC = [0x00, 0xa4, 0x00, 0x0c, 0x02, 0xe1, 0x03];
      await NfcManager.isoDepHandler.transceive(selectCC);

      // MARK 3 - read capability container
      const readCC = [0x00, 0xb0, 0x00, 0x00, 0x0f];
      await NfcManager.isoDepHandler.transceive(readCC);

      // MARK 4 - select NDEF file
      const selectNDEF = [0x00, 0xa4, 0x00, 0x0c, 0x02, 0xe1, 0x04];
      await NfcManager.isoDepHandler.transceive(selectNDEF);

      // MARK 5 - read NDEF file length
      const readNdefLength = [0x00, 0xb0, 0x00, 0x00, 0x02];
      const ndefLengthResponse =
        await NfcManager.isoDepHandler.transceive(readNdefLength);

      if (ndefLengthResponse.length >= 4) {
        const ndefLength = (ndefLengthResponse[0] << 8) | ndefLengthResponse[1];
        const readNdef = [0x00, 0xb0, 0x00, 0x02, ndefLength];
        const ndefContent = await NfcManager.isoDepHandler.transceive(readNdef);

        const decoded = decodeNDEFTextRecord(new Uint8Array(ndefContent));
        if (decoded.text) {
          message = JSON.parse(decoded.text);
        }
      }
    } catch (error) {
      Toast.show({
        text1: "Near field communication failed",
        text2: "please try again!",
        type: ToastType.Warning,
      });
    } finally {
      NfcManager.cancelTechnologyRequest().then(() => transfer(message));
    }
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
      <NfcActiveAnimate success={isRead || message !== undefined}>
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
                  className="flex-row gap-2 py-1.5 px-2 pr-3 w-min bg-background shadow-lg"
                >
                  <Avatar alt="Wallet Avatar">
                    <AvatarImage source={{ uri: message.avatar }} />
                    <AvatarFallback>
                      <Noble className="h-fit w-fit" />
                    </AvatarFallback>
                  </Avatar>
                  <Text
                    numberOfLines={1}
                    className="text-md font-semibold font-poppins-semibold text-muted-foreground"
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
                ? "You can close this page"
                : message
                  ? "Waiting for confirmation..."
                  : action === ActionType.Receive
                    ? "move your device closer to the sender"
                    : "move your device closer to the receipient"}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            {message === undefined && !isRead && (
              <Button
                className="rounded-2xl shadow-lg p-4"
                onPress={() => cleanUp(action)}
              >
                <Text className="font-bold font-poppins-bold">Cancel</Text>
              </Button>
            )}
          </CardFooter>
        </Card>
      </MotiView>
    </View>
  );
};

export default Action;
