import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useGlobalContext } from "~/context/provider";
import { Button } from "./ui/button";
import { QrCode } from "~/lib/icons/QrCode";
import { Link } from "expo-router";

export const WalletHeader = () => {
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

  return (
    <View className="flex-row items-center justify-between p-4 w-full fixed top-0">
      <View className="flex-row items-center gap-4">
        <Button variant={"ghost"} size={"icon"} className="rounded-full">
          <Avatar alt="Wallet Avatar">
            <AvatarImage source={{ uri: user?.avatar }} />
            <AvatarFallback>
              <Text>{getInitialsFromName(user?.name)}</Text>
            </AvatarFallback>
          </Avatar>
        </Button>
        <View className="justify-center">
          <Text className="font-bold font-poppins-bold text-lg text-foreground">
            {greetingText}
          </Text>
          <Text className="text-muted-foreground font-poppins-regular">
            {user?.address.slice(0, 6)}...{user?.address.slice(-8)}
          </Text>
        </View>
      </View>
      <Link href="/address-qr" asChild>
        <Button
          className="w-10 h-10 text-foreground"
          variant={"ghost"}
          size={"icon"}
        >
          <QrCode className="text-foreground" />
        </Button>
      </Link>
    </View>
  );
};
