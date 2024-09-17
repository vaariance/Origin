import { View } from "react-native";
import { useGlobalContext } from "~/context/provider";
import { Badge } from "~/components/ui/badge";
import { Text } from "~/components/ui/text";
import { Usdc } from "~/lib/icons/Usdc";
import { Button } from "~/components/ui/button";
import ExoticNumberInput from "~/components/ExoticNumberInput";
import { useState } from "react";
import { Link, useLocalSearchParams } from "expo-router";

const ActionSheet = () => {
  const query = useLocalSearchParams<
    Record<string, string> & { action: string }
  >();
  const { balance } = useGlobalContext();
  const [value, setValue] = useState("");

  return (
    <View className="flex-1 items-center justify-between mb-12 mt-6">
      <View className="items-center justify-center w-full px-8 ">
        <Text className="font-bold font-poppins-bold text-4xl text-center mb-6">
          {query.title}
        </Text>
        <View className="items-center w-full max-w-sm mb-16">
          <Badge
            variant={"secondary"}
            className="flex-row gap-2 py-1.5 px-3 w-min mb-16"
          >
            <Usdc className="h-8 w-8" />
            <Text className="text-base font-normal font-poppins-regular">
              {balance} USDC available
            </Text>
          </Badge>
        </View>
        <View className="w-full max-w-sm">
          <ExoticNumberInput value={value} onChangeText={setValue} />
        </View>
      </View>
      <Link
        href={{
          pathname: "/actions/[action]",
          params: { ...query, value },
        }}
        asChild
      >
        <Button
          className="rounded-2xl shadow-2xl w-4/5"
          size={"lg"}
          disabled={!value || Number(value) <= 0}
        >
          <Text className="font-bold font-poppins-bold">
            {query.actionButtonText ?? "Continue"}
          </Text>
        </Button>
      </Link>
    </View>
  );
};

export default ActionSheet;
