import { TextInputProps, View } from "react-native";
import { Text } from "./ui/text";
import { Input } from "./ui/input";

type ExoticNumberInputProps = Required<
  Pick<TextInputProps, "value" | "onChangeText">
> &
  Omit<TextInputProps, "value" | "onChangeText" | "className" | "inputMode">;

const ExoticNumberInput = (props: ExoticNumberInputProps) => {
  const handleChangeText = (text: string) => {
    const cleanedText = text.replace(/[^0-9.]/g, "");
    const parts = cleanedText.split(".");
    if (parts.length > 2) {
      parts.pop();
    }

    props.onChangeText(parts.join("."));
  };
  return (
    <View className="flex-row items-center justify-center w-full">
      <Text className="font-bold font-poppins-bold text-4xl text-muted-foreground/70">
        $
      </Text>
      <Input
        {...props}
        className="text-7xl text-muted-foreground font-bold font-poppins-bold text-start w-auto min-w-[150px]"
        onChangeText={handleChangeText}
        inputMode="numeric"
        placeholder="0.00"
        aria-labelledby="Amount (USD)"
        aria-errormessage="Invalid Input"
      />
    </View>
  );
};

export default ExoticNumberInput;
