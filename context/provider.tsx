import {
  createContext,
  useContext,
  useState,
  useEffect,
  PropsWithChildren,
  useCallback,
  useMemo,
} from "react";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NobleAddress } from "~/lib/useAuth";
import { useProxy } from "~/lib/useProxy";

export type OriginSigner = {
  unencryptedKey: string;
  encryptedKey: string;
};

export type OriginUser = {
  name: string;
  token: string;
  id: string;
  avatar: string;
  appSync: "pending" | "complete";
  publicKey: string;
  publicKeyEncodedType: "hex" | "base64";
  address: NobleAddress;
};

type GlobalContextType = Partial<{
  loading: boolean;
  signedIn: boolean;
  setSignedIn: React.Dispatch<React.SetStateAction<boolean>>;
  user: OriginUser;
  setUser: React.Dispatch<React.SetStateAction<OriginUser | undefined>>;
  balance: string;
  refreshBalance: () => void;
  // async storage ops
  saveUser: (user: OriginUser) => Promise<void>;
  getUser: () => Promise<OriginUser | null>;
  removeUser: () => Promise<void>;
  /// secure storage ops
  save: (key: string, value: string) => Promise<void>;
  getValueFor: (key: string) => Promise<string | null>;
  remove: (key: string) => Promise<void>;
}>;

export async function save(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}

export async function getValueFor(key: string) {
  return SecureStore.getItemAsync(key);
}

export async function remove(key: string) {
  await SecureStore.deleteItemAsync(key);
}

export async function saveUser(user: OriginUser): Promise<void> {
  const existing = await getUser();
  const value = { ...existing, ...user };
  const jsonValue = JSON.stringify(value);
  await AsyncStorage.setItem("origin_al_user", jsonValue);
}

export async function removeUser(): Promise<void> {
  await AsyncStorage.removeItem("origin_al_user");
}

export async function getUser(): Promise<OriginUser> {
  const jsonValue = await AsyncStorage.getItem("origin_al_user");
  return jsonValue != null ? JSON.parse(jsonValue) : {};
}

const GlobalContext = createContext<GlobalContextType>({});
export const useGlobalContext = () => useContext(GlobalContext);

export const GlobalProvider = ({ children }: PropsWithChildren) => {
  const { getBalance } = useProxy();
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [user, setUser] = useState<OriginUser>();
  const [loading, setLoading] = useState<boolean>(true);
  const [balance, setBalance] = useState<string>("0");

  useEffect(() => {
    getUser()
      .then((value) => {
        if (Object.values(value).length) {
          setSignedIn(true);
        } else {
          setSignedIn(false);
        }
        setUser(value);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const fetchBalance = useCallback(async () => {
    if (user) {
      const balance = await getBalance(user?.address);
      if (balance.ok) {
        setBalance(balance.unwrap().balance.amount);
      }
    }
  }, []);

  useMemo(() => {
    fetchBalance();
  }, [user?.address]);

  const refreshBalance = () => fetchBalance();

  return (
    <GlobalContext.Provider
      value={{
        signedIn,
        user,
        loading,
        setSignedIn,
        setUser,
        save,
        saveUser,
        getUser,
        getValueFor,
        remove,
        removeUser,
        balance,
        refreshBalance,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
