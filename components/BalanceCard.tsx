import { View } from "react-native";
import React from "react";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Text } from "./ui/text";
import { Badge } from "~/components/ui/badge";
import { Usdc } from "~/lib/icons/Usdc";
import { Noble } from "~/lib/icons/Noble";
import Animated, {
  CurvedTransition,
  Easing,
  ReduceMotion,
} from "react-native-reanimated";

export const BalanceCard = ({ hideFooter = false, balance = "0.00" }) => {
  return (
    <Animated.View
      layout={CurvedTransition.easingX(Easing.in(Easing.exp))
        .easingY(Easing.out(Easing.quad))
        .easingWidth(Easing.in(Easing.ease))
        .easingHeight(Easing.out(Easing.exp))
        .reduceMotion(ReduceMotion.Never)}
      className="p-4 items-center"
    >
      <Card className="w-full max-w-sm shadow-2xl rounded-3xl">
        <CardContent>
          <View className="flex-row items-center w-full gap-2 mt-6">
            <Text className="font-bold font-poppins-bold text-2xl text-muted-foreground/70">
              $
            </Text>
            <Text className="text-4xl font-bold font-poppins-bold text-start text-muted-foreground">
              {balance}
            </Text>
          </View>
        </CardContent>
        {!hideFooter && (
          <CardFooter>
            <View className="flex-row gap-3">
              <Badge
                variant={"secondary"}
                className="flex-row gap-2 py-1 px-2 w-min"
              >
                <Usdc className="h-5 w-5" />
                <Text className="text-base font-normal font-poppins-regular">
                  USDC
                </Text>
              </Badge>
              <Badge
                variant={"secondary"}
                className="flex-row gap-2 py-1 px-2 w-min"
              >
                <Noble className="h-5 w-5" />
                <Text className="text-base font-normal font-poppins-regular">
                  Noble
                </Text>
              </Badge>
            </View>
          </CardFooter>
        )}
      </Card>
    </Animated.View>
  );
};
