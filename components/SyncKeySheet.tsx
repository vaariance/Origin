import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Animated from "react-native-reanimated";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Text } from "~/components/ui/text";
import { OriginUser, useGlobalContext } from "~/context/provider";
import { Account } from "~/lib/cosmos/account";
import { toHex } from "~/lib/cosmos/crypto";
import { Toast, ToastType } from "~/lib/toast";
import { NobleAddress, useAuth } from "~/lib/useAuth";

export const SyncKeySheet = () => {
  const { syncSigningKey } = useAuth();
  const { loading, save, setUser, saveUser, getValueFor, user } =
    useGlobalContext();
  const [blocking, setBlocking] = useState<boolean>(false);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const handlePresentModalPress = useCallback(() => {
    bottomSheetModalRef.current?.present();
  }, []);
  const handleDimissModalPress = useCallback(() => {
    setBlocking(false);
    bottomSheetModalRef.current?.dismiss();
  }, []);
  const snapPoints = useMemo(() => ["50%"], []);

  const handleSyncKeyPress = async () => {
    setBlocking(true);
    const unencryptedKey = await getValueFor!("origin_al_key");
    const args = {
      account: Account.fromMnemonic(JSON.parse(unencryptedKey!).unencryptedKey),
      // todo: ask user password instead
      encryptionKey: user!.id,
      onError: (reason: string) => {
        Toast.show({
          text1: reason,
          type: ToastType.Error,
        });
        handleDimissModalPress();
      },
      onSuccess: async (config: any) => {
        if (config && user) {
          const wallet = Account.deserialize(
            JSON.parse(config),
            args.encryptionKey
          );
          const account = (await wallet.getAccounts())[0];
          const newUser: OriginUser = {
            ...user,
            appSync: "complete",
            publicKey: toHex(account.pubkey),
            publicKeyEncodedType: "hex",
            address: account.address as NobleAddress,
          };
          await Promise.all([
            saveUser?.(newUser),
            save?.(
              "origin_al_key",
              JSON.stringify({
                unencryptedKey: wallet.mnemonic,
                encryptedKey: config,
              })
            ),
          ]);
          setUser?.(newUser);

          Toast.show({
            text1: "Backup/Sync is complete!",
            type: ToastType.Success,
          });
          handleDimissModalPress();
        }
      },
    };

    await syncSigningKey(args);
  };

  useEffect(() => {
    (async () => {
      if (!loading && (!user?.appSync || user?.appSync === "pending")) {
        setTimeout(() => {
          handlePresentModalPress();
        }, 1000);
      }
    })();
  }, [loading]);

  return (
    <BottomSheetModal
      name="sync-key-modal"
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      detached={true}
      bottomInset={35}
      handleComponent={({}) => {
        return (
          <Animated.View
            renderToHardwareTextureAndroid={true}
            className="bg-muted-foreground w-12 h-[5px] rounded-[28px] self-center mb-3 mt-4"
          />
        );
      }}
      backgroundComponent={({}) => {
        return (
          <Animated.View pointerEvents="none" className="bg-background/0" />
        );
      }}
    >
      <Card
        className="mx-auto h-full items-center
   rounded-[28px] bg-accent shadow-2xl w-11/12 border-accent justify-between py-4 backdrop-blur-2xl"
      >
        <CardHeader className="gap-4">
          <CardTitle className="text-5xl text-center font-bold font-poppins-bold">
            Backup and Sync with Cloud
          </CardTitle>
          <CardDescription className="text-xl font-poppins-regular">
            Authorize access to google drive to enable us backup this wallet or
            sync an existing one.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            className="rounded-2xl shadow-lg w-3/5"
            size={"lg"}
            disabled={blocking}
            onPress={handleSyncKeyPress}
          >
            <Text className="font-bold font-poppins-bold">Proceed</Text>
          </Button>
        </CardFooter>
      </Card>
    </BottomSheetModal>
  );
};
