import { View, Text, Pressable, ViewProps } from "react-native";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useGlobalContext } from "~/context/provider";
import { Button } from "./ui/button";
import { QrCode } from "~/lib/icons/QrCode";
import { Link } from "expo-router";
import { cn } from "~/lib/utils";
import Animated, {
  CurvedTransition,
  Easing,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  SlideInUp,
} from "react-native-reanimated";

export enum WalletHeaderState {
  expanded = "expanded",
  collapsed = "collapsed",
  default = "expanded",
}

type WalletHeaderProps = {
  name?: string;
  avatar?: string;
  address?: string;
  greeting?: string;
};

const WalletHeaderAvatar = ({
  name,
  avatar,
  ...props
}: WalletHeaderProps & Omit<ViewProps, "children">) => (
  <>
    <View
      className={cn(
        "rounded-full ",
        props.className && "p-1 bg-primary/60 border border-input shadow-2xl"
      )}
    >
      <Avatar alt="Wallet Avatar" className={props.className}>
        <AvatarImage source={{ uri: avatar }} />
        <AvatarFallback className="bg-background">
          <Text className="text-muted-foreground text-xl font-poppins-extra-bold">
            {name}
          </Text>
        </AvatarFallback>
      </Avatar>
    </View>
  </>
);

const WalletHeaderAddress = ({ address, greeting }: WalletHeaderProps) => (
  <>
    <Text className="font-bold font-poppins-bold text-lg text-foreground">
      {greeting}
    </Text>
    <Text className="text-muted-foreground font-poppins-regular">
      {address?.slice(0, 6)}...{address?.slice(-8)}
    </Text>
  </>
);

const WalletHeaderQrCode = () => (
  <>
    <Link href="/address-qr" asChild>
      <Button
        className="w-10 h-10 text-foreground"
        variant={"ghost"}
        size={"icon"}
      >
        <QrCode className="text-foreground" />
      </Button>
    </Link>
  </>
);

const WalletHeaderCollapsed = ({
  name,
  avatar,
  address,
  greeting,
}: WalletHeaderProps) => (
  <View className="flex-row items-center justify-between p-4 w-full fixed top-0">
    <Animated.View
      layout={CurvedTransition}
      entering={FadeInUp.delay(100).duration(400).easing(Easing.ease)}
      exiting={FadeOutUp.duration(400).easing(Easing.ease)}
      className="flex-row items-center gap-4"
    >
      <WalletHeaderAvatar name={name} avatar={avatar} />
      <View className="justify-center">
        <WalletHeaderAddress address={address} greeting={greeting} />
      </View>
    </Animated.View>
    <WalletHeaderQrCode />
  </View>
);

const WalletHeaderExpanded = ({
  name,
  avatar,
  address,
  greeting,
}: WalletHeaderProps) => (
  <View className="fixed top-0 p-4 gap-12">
    <View className="flex-row justify-end items-center">
      <WalletHeaderQrCode />
    </View>
    <Animated.View
      layout={CurvedTransition}
      entering={SlideInUp.delay(150)
        .easing(Easing.ease)
        .springify()
        .damping(100)
        .mass(1)
        .stiffness(100)}
      exiting={FadeOutDown.duration(400).easing(Easing.ease)}
      className="flex-col items-center justify-center gap-4"
    >
      <WalletHeaderAvatar name={name} avatar={avatar} className="w-16 h-16" />
      <View className="items-center">
        <WalletHeaderAddress address={address} greeting={greeting} />
      </View>
    </Animated.View>
  </View>
);

export const WalletHeader = ({ state }: { state?: WalletHeaderState }) => {
  const { user } = useGlobalContext();
  const [greetingText, setGreetingText] = useState("Good morning");

  const getInitialsFromName = (name?: string) => {
    if (!name) return "$$";
    const names = name.trim().split(/\s+/);
    if (names.length === 1) {
      return name.slice(0, 2).toUpperCase();
    }
    return names
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  useEffect(() => {
    const updateGreeting = () => {
      const name = user?.name.split(/\s+/)[0].toLowerCase();
      const currentTime = new Date().getHours();
      let greeting = `Good morning ${name}`;
      if (currentTime >= 12 && currentTime < 17) {
        greeting = `Good afternoon ${name}`;
      } else if (currentTime >= 17) {
        greeting = `Good evening ${name}`;
      }
      setGreetingText(greeting);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 5000);
    return () => clearInterval(interval);
  }, []);

  if (state === WalletHeaderState.collapsed) {
    return (
      <WalletHeaderCollapsed
        name={getInitialsFromName(user?.name)}
        avatar={user?.avatar}
        address={user?.address}
        greeting={greetingText}
      />
    );
  }

  return (
    <WalletHeaderExpanded
      name={getInitialsFromName(user?.name)}
      avatar={user?.avatar}
      address={user?.address}
      greeting={greetingText}
    />
  );
};
