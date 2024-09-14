import { StyleSheet, View } from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Fingerprint } from "~/lib/icons/Biometric";
import { MotiView } from "moti";
import { Button } from "./ui/button";

export function BiometricAnimate() {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="rounded-full w-24 h-24 items-center justify-center">
        <MotiView
          className="h-full w-full shadow-2xl"
          from={{
            rotate: "0deg",
            shadowOpacity: 0.5,
          }}
          animate={{
            rotate: "360deg",
            shadowOpacity: 1,
          }}
          transition={{
            type: "timing",
            duration: 4000,
            loop: true,
            repeatReverse: false,
          }}
          style={{
            borderRadius: 48,
            shadowOpacity: 1,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
            ...StyleSheet.absoluteFillObject,
          }}
        >
          <LinearGradient
            colors={[
              "#00FFFF", // Bright Cyan
              "#1E90FF", // Dodger Blue
              "#4169E1", // Royal Blue
              "#8A2BE2", // Blue Violet
              "#9400D3", // Dark Violet
              "#8B008B", // Dark Magenta
            ]}
            start={{ x: 0.0, y: 1.0 }}
            end={{ x: 1.0, y: 1.0 }}
            style={{
              borderRadius: 48,
              width: "100%",
              height: "100%",
            }}
          />
        </MotiView>
        <Button variant={"ghost"}>
          <View className="rounded-full bg-secondary w-[5.7rem] h-[5.7rem] items-center justify-center backdrop-blur-md">
            <Fingerprint width={60} height={60} className="text-foreground" />
          </View>
        </Button>
      </View>
    </View>
  );
}
