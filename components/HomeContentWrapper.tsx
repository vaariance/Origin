import { View, ViewProps } from "react-native";
import { FC, PropsWithChildren } from "react";
import { Text } from "./ui/text";

export const HomeContentWrapper: FC<
  PropsWithChildren<{ sectionTitle?: string }> & ViewProps
> = ({ children, sectionTitle, ...props }) => {
  return (
    <View className="gap-4 p-4" {...props}>
      {sectionTitle && (
        <Text className="font-poppins-semibold text-base ml-4 p-4">
          {sectionTitle}
        </Text>
      )}
      <View className="items-center">{children}</View>
    </View>
  );
};

export default HomeContentWrapper;
