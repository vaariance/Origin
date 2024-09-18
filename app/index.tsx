import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalContext } from "~/context/provider";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { ActionableCards } from "~/components/ActionableCards";
import { BalanceCard } from "~/components/BalanceCard";
import { SyncKeySheet } from "~/components/SyncKeySheet";
import { TransactionSheet } from "~/components/TransactionSheet";
import { WalletHeader, WalletHeaderState } from "~/components/WalletHeader";
import { useMemo, useState } from "react";
import { Transaction } from "~/lib/useProxy";
import { MotiScrollView } from "moti";
import { RefreshControl, View } from "react-native";

export default function Home() {
  const { loading, signedIn, fetchTransactions, balance, refreshBalance } =
    useGlobalContext();
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[] | undefined>();
  const [headerState, setHeaderState] = useState<WalletHeaderState>(
    WalletHeaderState.default
  );

  const refetch = useMemo(
    () => () => {
      setIsFetching(true);
      refreshBalance?.();
      fetchTransactions?.().then((txs) => {
        setTransactions(txs);
        setIsFetching(false);
      });
    },
    [fetchTransactions]
  );

  const onSnap = (index: number) => {
    switch (index) {
      case 0:
        setHeaderState(WalletHeaderState.expanded);
        break;
      case 1:
        setHeaderState(WalletHeaderState.collapsed);
      default:
        break;
    }
  };

  if (loading) {
    return null;
  }

  if (!loading && !signedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView>
      <BottomSheetModalProvider>
        <View className="h-full">
          <MotiScrollView
            contentContainerStyle={{
              flex: 1,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setTimeout(() => setRefreshing(false), 2000);
                  refetch();
                }}
              />
            }
          >
            <WalletHeader state={headerState} />
            <BalanceCard balance={balance} />
            <ActionableCards />
          </MotiScrollView>
          <SyncKeySheet />
          <TransactionSheet
            onSnap={onSnap}
            refetch={refetch}
            transactions={transactions}
            isFetching={isFetching}
          />
        </View>
      </BottomSheetModalProvider>
    </SafeAreaView>
  );
}
