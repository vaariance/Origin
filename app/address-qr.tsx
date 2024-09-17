import { View } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCodeStyled from "react-native-qrcode-styled";
import { useGlobalContext } from "~/context/provider";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Copy } from "~/lib/icons/Copy";
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
} from "react-native-reanimated";

const AddressQrCenter = () => {
  const { user } = useGlobalContext();

  const copyToClipboard = async () => {
    if (user) {
      await Clipboard.setStringAsync(user.address);
    }
  };

  return (
    <View className="flex-1 items-center justify-around">
      <View>
        <Animated.View className="rounded-2xl overflow-hidden bg-secondary">
          <QRCodeStyled
            data={user?.address}
            padding={25}
            pieceSize={8}
            pieceBorderRadius={[0, 6, 0, 6]}
            isPiecesGlued
            gradient={{
              type: "linear",
              options: {
                start: [0, 0],
                end: [1, 1],
                colors: ["#EC52FF", "#5C52FF"],
                locations: [0, 1],
              },
            }}
            outerEyesOptions={{
              borderRadius: 12,
            }}
            logo={{
              href: require("../assets/images/256x256.png"),
            }}
          />
        </Animated.View>
      </View>

      <View>
        <Button
          onPress={copyToClipboard}
          variant={"outline"}
          className="rounded-2xl inline-flex items-center flex-row gap-2"
        >
          <Copy className="h-2 w-2 text-foreground" />
          <Text className="font-poppins-semibold font-semibold">
            Copy Wallet Address
          </Text>
        </Button>
      </View>
    </View>
  );
};

export default AddressQrCenter;
