import { View, ViewProps } from "react-native";
import { FC, PropsWithChildren } from "react";
import { Text } from "./ui/text";
import { cn } from "~/lib/utils";

export const HomeContentWrapper: FC<
  PropsWithChildren<{
    sectionTitle?: string;
    contentClassname?: string;
  }> &
    ViewProps
> = ({ children, sectionTitle, contentClassname, ...props }) => {
  return (
    <View className={cn("gap-4 p-4", props.className)} {...props}>
      {sectionTitle && (
        <Text className="font-poppins-semibold text-base ml-4 p-4">
          {sectionTitle}
        </Text>
      )}
      <View className={contentClassname}>{children}</View>
    </View>
  );
};

export default HomeContentWrapper;
