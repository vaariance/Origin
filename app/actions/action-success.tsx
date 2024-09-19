import { Text, View } from "react-native";
import React from "react";
import { Button } from "~/components/ui/button";
import { Link } from "expo-router";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "~/components/ui/card";
import { ThumbsUp } from "~/lib/icons/ThumbsUp";
import { useColorScheme } from "~/lib/useColorScheme";

const ActionSuccess = () => {
  const { isDarkColorScheme } = useColorScheme();
  return (
    <View className="flex-1 justify-end bg-background h-full">
      <Card className="w-full h-full items-center border-transparent justify-evenly py-4">
        <View className="p-12 justify-center items-center bg-success/50 rounded-full">
          <View className="p-12 justify-center items-center bg-success rounded-full">
            <View className="p-8 justify-center items-center bg-background rounded-full">
              <ThumbsUp width={50} height={50} className="text-success" />
            </View>
          </View>
        </View>
        <CardHeader className="gap-4">
          <CardTitle className="text-4xl text-center font-bold font-poppins-bold">
            Transaction Complete
          </CardTitle>
          <CardDescription className="text-center font-poppins-regular">
            You can close this page now
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href={"/"} asChild>
            <Button
              variant={"outline"}
              size={"lg"}
              className="rounded-2xl shadow-lg"
            >
              <Text
                className="font-poppins-semibold text-foreground"
                style={{
                  color: isDarkColorScheme ? "#F9FAFB" : "#030712",
                }}
              >
                Go to Wallet
              </Text>
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </View>
  );
};

export default ActionSuccess;
