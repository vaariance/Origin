import { MotiView } from "moti";
import { PropsWithChildren } from "react";
import { View, StyleSheet } from "react-native";
import { Easing } from "react-native-reanimated";
import { cn } from "~/lib/utils";

const NfcActiveAnimate = ({
  children,
  success = false,
}: PropsWithChildren & { success: boolean }) => {
  return (
    <View className="flex-1 items-center justify-center">
      <View
        className={cn(
          "rounded-full bg-primary w-24 h-24 items-center justify-center",
          success ? "bg-success" : "bg-primary"
        )}
      >
        {[...Array(4).keys()].map((i) => {
          return (
            <MotiView
              className={cn(
                "w-24 h-24 rounded-full",
                success ? "bg-success" : "bg-primary"
              )}
              from={{ opacity: 0.7, scale: 1 }}
              animate={{ opacity: 0, scale: 4 }}
              transition={{
                type: "timing",
                duration: 2000,
                delay: i * 400,
                easing: Easing.out(Easing.ease),
                loop: !success,
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
