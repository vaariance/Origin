import { View } from "react-native";
import React from "react";
import { Text } from "./ui/text";
import { Action } from "~/constants";
import { Link } from "expo-router";
import { Send } from "~/lib/icons/Send";
import { CreditCard } from "~/lib/icons/Buy";
import { Plus } from "~/lib/icons/Receive";
import { Banknote } from "~/lib/icons/Sell";
import HomeContentWrapper from "./HomeContentWrapper";
import Animated, {
  Easing,
  CurvedTransition,
  ReduceMotion,
} from "react-native-reanimated";
const actionIconClassname = "h-6 w-6 text-primary";

const actions: {
  action: Action;
  name: string;
  title?: string;
  pathname: "/[action]" | "/actions/[action]";
  value?: string;
  icon: React.ReactNode;
}[] = [
  {
    action: Action.Send,
    name: "Send",
    title: "How much do you want to send?",
    pathname: "/[action]",
    icon: <Send className={actionIconClassname} />,
  },
  {
    action: Action.Receive,
    name: "Receive",
    value: "",
    pathname: "/actions/[action]",
    icon: <Plus className={actionIconClassname} />,
  },
  {
    action: Action.Buy,
    name: "Top Up",
    title: "How much do you want to add?",
    pathname: "/[action]",
    icon: <CreditCard className={actionIconClassname} />,
  },
  {
    action: Action.Sell,
    name: "Cash Out",
    title: "How much do you want to widraw?",
    pathname: "/[action]",
    icon: <Banknote className={actionIconClassname} />,
  },
];

export const ActionableCards = () => {
  return (
    <HomeContentWrapper className="mt-6">
      <Animated.View
        layout={CurvedTransition.easingX(Easing.in(Easing.exp))
          .easingY(Easing.out(Easing.quad))
          .easingWidth(Easing.in(Easing.ease))
          .easingHeight(Easing.out(Easing.exp))
          .reduceMotion(ReduceMotion.Never)}
        className="items-center flex-row gap-4"
      >
        {actions.map(({ action, name, title, icon, pathname, value }) => (
          <Link
            key={name}
            href={{
              pathname,
              params: {
                action,
                value,
                name,
                title,
              },
            }}
          >
            <View className="rounded-xl shadow-2xl bg-secondary p-2 py-3 items-center justify-center min-w-[75px] gap-4">
              {icon}
              <Text className="text-sm font-poppins-semibold">{name}</Text>
            </View>
          </Link>
        ))}
      </Animated.View>
    </HomeContentWrapper>
  );
};
