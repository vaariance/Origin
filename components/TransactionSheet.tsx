import { FlatList, View } from "react-native";
import { Text } from "./ui/text";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Card } from "./ui/card";
import Animated from "react-native-reanimated";
import { useGlobalContext } from "~/context/provider";
import { Transaction } from "~/lib/useProxy";
import { TxEmpty } from "~/lib/icons/TxEmpty";
import { TxIncoming } from "~/lib/icons/TxIncoming";
import { TxOutgoing } from "~/lib/icons/TxOutgoing";
import { AnimatePresence, MotiView, useAnimationState } from "moti";
import { Skeleton } from "moti/skeleton";
import { useColorScheme } from "~/lib/useColorScheme";
import { Separator } from "./ui/separator";
import HomeContentWrapper from "./HomeContentWrapper";

export const TransactionSheet = ({
  onSnap,
  refetch,
  transactions,
  isFetching,
}: {
  onSnap?: (index: number) => void;
  refetch: () => void;
  transactions: Transaction[] | undefined;
  isFetching: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const { loading } = useGlobalContext();

  const animationState = useAnimationState({
    232: {
      height: 232,
    },
    532: {
      height: 532,
    },
  });

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["37%", "87%"], []);
  const handleSheetChange = useCallback((index: number) => {
    onSnap?.(index);
    const snapPoint = 6 * Number(snapPoints[index].replace("%", "")) + 10;
    animationState.transitionTo(snapPoint as 232 | 532);
  }, []);

  useEffect(() => {
    if (!loading) {
      bottomSheetModalRef.current?.present();
      refetch();
    }
  }, [loading]);

  return (
    <BottomSheetModal
      name="tx-modal"
      index={0}
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      handleComponent={({}) => {
        return (
          <Animated.View
            renderToHardwareTextureAndroid={true}
            className="bg-muted w-12 h-[5px] rounded-[28px] self-center mb-3 mt-4"
          />
        );
      }}
      backgroundComponent={({}) => {
        return (
          <Animated.View pointerEvents="none" className="bg-background/0" />
        );
      }}
      onChange={handleSheetChange}
      enablePanDownToClose={false}
      enableOverDrag={false}
      enableDismissOnClose={!isFetching}
      enableHandlePanningGesture={!isFetching}
      enableContentPanningGesture={!isFetching}
    >
      <Card
        className="w-full h-full items-center
     rounded-t-[36px] bg-background shadow-xl justify-between backdrop-blur p-4"
      >
        <HomeContentWrapper
          sectionTitle="Transactions"
          className="w-full h-full"
        >
          <AnimatePresence>
            {isFetching ? (
              <MotiView className="w-full h-full">
                <FlatList
                  data={["a", "b", "c"]}
                  keyExtractor={(item) => item}
                  renderItem={({ index }) => (
                    <SkeletonItem colorMode={colorScheme} index={index} />
                  )}
                  ItemSeparatorComponent={Separator}
                />
              </MotiView>
            ) : transactions?.length ? (
              <MotiView className="w-full h-full">
                <FlatList
                  data={transactions}
                  keyExtractor={(item) => item.txHash}
                  renderItem={({ item, index }) => (
                    <TransactionItem item={item} index={index} />
                  )}
                  ItemSeparatorComponent={Separator}
                />
              </MotiView>
            ) : (
              <EmptyList state={animationState} />
            )}
          </AnimatePresence>
        </HomeContentWrapper>
      </Card>
    </BottomSheetModal>
  );
};

const TransactionItem = ({
  item,
  index,
}: {
  item: Transaction;
  index: number;
}) => (
  <MotiView
    from={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    delay={index * 150}
    className="flex-row items-center justify-between gap-2 w-full max-w-sm self-center my-4"
  >
    <View className="flex-row items-center gap-6">
      <View className="rounded-xl bg-secondary w-10 h-10 items-center justify-center">
        {item.direction === "sent" ? (
          <TxOutgoing className="text-muted-foreground" />
        ) : (
          <TxIncoming className="text-muted-foreground" />
        )}
      </View>
      <View className="flex-col items-start justify-center">
        {item.direction === "sent" ? (
          <>
            <Text className="font-poppins-medium">
              {item.to.slice(0, 6)}...{item.to.slice(-8)}
            </Text>
            <Text className="font-poppins-light text-muted-foreground">
              {item.direction}
            </Text>
          </>
        ) : (
          <>
            <Text className="font-poppins-medium">
              {item.from.slice(0, 6)}...{item.from.slice(-8)}
            </Text>
            <Text className="font-poppins-light text-muted-foreground">
              {item.direction}
            </Text>
          </>
        )}
      </View>
    </View>
    {item.direction === "sent" ? (
      <Text className="font-poppins-medium">- ${item.amount}</Text>
    ) : (
      <Text className="font-poppins-medium">+ ${item.amount}</Text>
    )}
  </MotiView>
);

const SkeletonItem = ({
  colorMode,
  index,
}: {
  colorMode: "dark" | "light";
  index: number;
}) => (
  <MotiView
    from={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    delay={index * 150}
    className="flex-row items-center justify-between gap-2 w-full max-w-sm self-center my-4"
  >
    <View className="flex-row items-center gap-6">
      <Skeleton colorMode={colorMode} radius={15} height={40} width={40} />
      <View className="flex-col items-center gap-2">
        <Skeleton colorMode={colorMode} width={120} height={20} />
        <Skeleton colorMode={colorMode} width={120} height={10} />
      </View>
    </View>
    <Skeleton colorMode={colorMode} width={75} height={30} />
  </MotiView>
);

const EmptyList = ({ state }: { state: any }) => (
  <MotiView
    from={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.1 }}
    state={state}
    className="w-full items-center justify-center rounded-[36px]"
  >
    <TxEmpty width={40} height={40} className="mb-8 text-primary" />
    <Text className="text-muted-foreground text-lg text-center px-8 font-poppins-regular">
      No transactions found
    </Text>
  </MotiView>
);
