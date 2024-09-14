import { MotiView } from "moti";
import { PropsWithChildren } from "react";
import { View, StyleSheet } from "react-native";
import { Easing } from "react-native-reanimated";

const NfcActiveAnimate = ({ children }: PropsWithChildren) => {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="rounded-full bg-primary w-24 h-24 items-center justify-center">
        {[...Array(4).keys()].map((i) => {
          return (
            <MotiView
              className="w-24 h-24 rounded-full bg-primary"
              from={{ opacity: 0.7, scale: 1 }}
              animate={{ opacity: 0, scale: 4 }}
              transition={{
                type: "timing",
                duration: 2000,
                delay: i * 400,
                easing: Easing.out(Easing.ease),
                loop: true,
                repeatReverse: false,
              }}
              key={i}
              style={[StyleSheet.absoluteFillObject]}
            />
          );
        })}
        {children}
      </View>
    </View>
  );
};

export default NfcActiveAnimate;
